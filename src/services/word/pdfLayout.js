import { getDocument, GlobalWorkerOptions, OPS, Util } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc = workerUrl

const normalized = value => String(value ?? '').normalize('NFKC').replace(/\s/g, '')
const identity = [1, 0, 0, 1, 0, 0]
const point = (matrix, x, y) => [matrix[0]*x+matrix[2]*y+matrix[4], matrix[1]*x+matrix[3]*y+matrix[5]]
function bounds(matrix, box, viewport) {
  const corners = [[box[0],box[1]], [box[2],box[1]], [box[0],box[3]], [box[2],box[3]]].map(([x,y]) => viewport.convertToViewportPoint(...point(matrix,x,y)))
  return { left: Math.min(...corners.map(p=>p[0])), right: Math.max(...corners.map(p=>p[0])), top: Math.min(...corners.map(p=>p[1])), bottom: Math.max(...corners.map(p=>p[1])) }
}
function operations(list, viewport) {
  let matrix = identity, fill = '#000000', stroke = '#000000', opacity = 1
  const stack = [], masks = [], lines = [], shows = []
  let characters = ''
  const addLine = (box, order, ink) => {
    if (ink === '#ffffff') return
    const width = box.right-box.left, height = box.bottom-box.top
    if (width > 8 && height < 2.5) lines.push({ x1: box.left, x2: box.right, y1: (box.top+box.bottom)/2, y2: (box.top+box.bottom)/2, order })
    if (height > 8 && width < 2.5) lines.push({ x1: (box.left+box.right)/2, x2: (box.left+box.right)/2, y1: box.top, y2: box.bottom, order })
  }
  for (let index=0; index<list.fnArray.length; index++) {
    const op=list.fnArray[index], args=list.argsArray[index]
    if(op===OPS.save) stack.push({matrix,fill,stroke,opacity})
    else if(op===OPS.restore) { const saved=stack.pop(); if(saved)({matrix,fill,stroke,opacity}=saved) }
    else if(op===OPS.transform) matrix=Util.transform(matrix,args)
    else if(op===OPS.setFillRGBColor) fill=args[0]
    else if(op===OPS.setStrokeRGBColor) stroke=args[0]
    else if(op===OPS.setGState) { for(const [key,value] of args[0]) if(key==='ca')opacity=value }
    else if(op===OPS.showText || op===OPS.showSpacedText) {
      const string=args[0].filter(g=>typeof g==='object').map(g=>g.unicode??'').join('')
      const str=normalized(string),color=fill
      if(str){ shows.push({start:characters.length,end:characters.length+str.length,order:index,color});characters+=str }
    } else if(op===OPS.constructPath) {
      const paint=args[0]
      if(paint===OPS.endPath)continue
      const box=bounds(matrix,args[2],viewport)
      const fills=[OPS.fill,OPS.eoFill,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(paint)
      if(fills&&fill==='#ffffff'&&opacity>=.99) masks.push({...box,order:index})
      if(fills) addLine(box,index,fill)
      if([OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke].includes(paint)) {
        const chunks=args[1] ?? []
        for(const chunk of chunks){const path=Array.from(chunk);let previous,first
          for(let i=0;i<path.length;){const command=path[i++]
            if(command===0){previous=point(matrix,path[i++],path[i++]);first=previous}
            else if(command===1){const next=point(matrix,path[i++],path[i++]);if(previous){const a=viewport.convertToViewportPoint(...previous),b=viewport.convertToViewportPoint(...next);addLine({left:Math.min(a[0],b[0]),right:Math.max(a[0],b[0]),top:Math.min(a[1],b[1]),bottom:Math.max(a[1],b[1])},index,stroke)}previous=next}
            else if(command===2){i+=6;previous=point(matrix,path[i-2],path[i-1])}
            else if(command===3){i+=4;previous=point(matrix,path[i-2],path[i-1])}
            else if(command===4)previous=first
            else break
          }
        }
      }
    }
  }
  return { masks, lines, shows, characters }
}
function fontOptions(page, item, style) {
  const font=page.commonObjs.has(item.fontName)?page.commonObjs.get(item.fontName):{}
  const name=font.name ?? style?.fontFamily ?? ''
  return { font: /arial|helvetica|sans/i.test(name)?'Arial':/calibri/i.test(name)?'Calibri':'Times New Roman', bold:/bold|black|demi/i.test(name), italics:/italic|oblique/i.test(name) }
}
export function collectPdfLines(fragments) {
  const sorted=[...fragments].sort((a,b)=>a.y-b.y||a.x-b.x), lines=[]
  for(const part of sorted){const last=lines.at(-1);if(last&&Math.abs(last.y-part.y)<Math.min(2.8,part.size*.2)){last.parts.push(part);last.top=Math.min(last.top,part.top);last.bottom=Math.max(last.bottom,part.bottom)}else lines.push({y:part.y,top:part.top,bottom:part.bottom,parts:[part]})}
  for(const line of lines)line.parts.sort((a,b)=>a.x-b.x)
  return lines
}
export async function readPdfLayout(source, name) {
  const response=await fetch(source)
  if(!response.ok)throw new Error(name+': HTTP '+response.status)
  const data=new Uint8Array(await response.arrayBuffer())
  if(!new TextDecoder().decode(data.slice(0,5)).startsWith('%PDF-'))throw new Error(name+': invalid PDF source')
  const task=getDocument({data,fontExtraProperties:true,useSystemFonts:true,useWasm:false,isEvalSupported:false,stopAtErrors:true})
  try{
    const pdf=await task.promise,pages=[]
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n),viewport=page.getViewport({scale:1}),list=await page.getOperatorList(),content=await page.getTextContent()
      const paint=operations(list,viewport),fragments=[];let cursor=0
      for(const item of content.items){
        if(!item.str?.trim())continue
        const value=normalized(item.str),offset=paint.characters.indexOf(value,cursor)
        if(offset>=0)cursor=offset+value.length
        const show=paint.shows.find(s=>s.end>(offset>=0?offset:cursor))??paint.shows.at(-1)
        const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]),size=Math.hypot(item.transform[2],item.transform[3])||item.height
        const top=y-size*(content.styles[item.fontName]?.ascent??.8),bottom=y+size*.15,width=item.width
        // Ignore old template text that the working generator erased before adding current values.
        const covered=paint.masks.some(mask=>mask.order>(show?.order??0)&&mask.left<x+width-.5&&mask.right>x+.5&&mask.top<y-size*.3&&mask.bottom>y-size*.3)
        if(covered)continue
        const underlined=paint.lines.some(line=>line.y1===line.y2&&line.y1>=y&&line.y1<=y+3&&line.x1<=x+2&&line.x2>=x+width-2)
        fragments.push({str:item.str,x,y,top,bottom,width,size,...fontOptions(page,item,content.styles[item.fontName]),underline:underlined,color:(show?.color??'#000000').replace('#','')})
      }
      if(!fragments.length)throw new Error(name+' page '+n+': no editable text was found')
      pages.push({width:viewport.width,height:viewport.height,fragments,lines:paint.lines.filter(line=>!paint.masks.some(mask=>mask.order>line.order&&mask.left+1<(line.x1+line.x2)/2&&mask.right-1>(line.x1+line.x2)/2&&mask.top+1<(line.y1+line.y2)/2&&mask.bottom-1>(line.y1+line.y2)/2))})
      page.cleanup()
    }
    return pages
  }finally{await task.destroy()}
}
