import { Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, TableLayoutType, SectionType, LineRuleType, HeightRule, VerticalMergeType, PageOrientation, Tab, TabStopType } from 'docx'
import { readPdfLayout, collectPdfLines } from './pdfLayout'
import { sectionMarker } from './wordHelpers'

const twips = value => Math.round(value * 20)
const cluster = values => values.sort((a,b)=>a-b).reduce((all,value)=>{const last=all.at(-1);if(last!=null&&Math.abs(last-value)<1.5)all[all.length-1]=(last+value)/2;else all.push(value);return all},[])
const none = { style: BorderStyle.NONE, size: 0 }
const border = { style: BorderStyle.SINGLE, size: 4, color: '444444' }
function tableRegions(lines) {
  const groups=[]
  const overlaps=(a,b)=>Math.max(a.x1,b.x1)<=Math.min(a.x2,b.x2)+1.5&&Math.max(a.y1,b.y1)<=Math.min(a.y2,b.y2)+1.5
  for(const line of lines){const found=groups.filter(g=>g.some(other=>overlaps(line,other)));if(!found.length)groups.push([line]);else {const first=found[0];first.push(line);for(const group of found.slice(1)){first.push(...group);groups.splice(groups.indexOf(group),1)}}}
  return groups.map(group=>{
    const horizontal=group.filter(l=>Math.abs(l.y1-l.y2)<.1),vertical=group.filter(l=>Math.abs(l.x1-l.x2)<.1)
    if(horizontal.length<2||vertical.length<1)return null
    const xs=cluster([...vertical.map(l=>l.x1),...horizontal.flatMap(l=>[l.x1,l.x2])]),ys=cluster(horizontal.map(l=>l.y1))
    if(xs.length<2||ys.length<2||xs.at(-1)-xs[0]<80||ys.at(-1)-ys[0]<20)return null
    return {left:xs[0],right:xs.at(-1),top:ys[0],bottom:ys.at(-1),xs,ys,horizontal,vertical}
  }).filter(Boolean).sort((a,b)=>a.top-b.top)
}
function runs(line, gapThreshold = 18, positionedGaps = false) {
  const result=[];let end,previous
  for(const part of line.parts){
    if(end!=null&&part.x-end>gapThreshold) {
      // Explicit styled spaces preserve PDF gaps in Word and docx-preview,
      // whose normal renderer does not resolve custom tab stops.
      const gap = part.x-end
      result.push(positionedGaps ? new TextRun({text:' '.repeat(Math.max(1,Math.round(gap/(part.size*(part.font==='Arial'?.278:.25))))),font:part.font,size:Math.round(part.size*2),bold:part.bold,italics:part.italics}) : new TextRun({children:[new Tab()]}))
    }
    else if(end!=null&&!/^[\s,.;:!?)]/.test(part.str)&&!/[\s(]$/.test(previous.str)&&(part.x-end>part.size*.15||part.bold!==previous.bold||part.italics!==previous.italics))result.push(new TextRun({text:' ',size:Math.round(part.size*2),font:part.font}))
    result.push(new TextRun({text:part.str,font:part.font,size:Math.round(part.size*2),bold:part.bold,italics:part.italics,underline:part.underline?{}:undefined,color:part.color}))
    end=part.x+part.width;previous=part
  }
  return result
}
function lineParagraph(line, origin, before = 0, policy = {}) {
  const size=Math.max(...line.parts.map(p=>p.size))
  return new Paragraph({ style:policy.paragraphStyle, children:runs(line,policy.positionedGaps ? size * .5 : 18,policy.positionedGaps), tabStops:line.parts.slice(1).filter((part,i)=>part.x-(line.parts[i].x+line.parts[i].width)>(policy.positionedGaps ? size * .5 : 18)).map(part=>({type:TabStopType.LEFT,position:twips(part.x-origin)})), indent:{left:twips(Math.max(0,line.parts[0].x-origin))}, spacing:{before:twips(Math.max(0,before)),after:0,line:twips(policy.exactLineSpacing ? line.bottom-line.top : size*1.04),lineRule:LineRuleType.EXACT}, keepTogether:true })
}
function buildTable(region, fragments, headerRows, pageLeft, policy = {}) {
  const {xs,ys}=region,rows=[]
  const hasV=(x,y)=>region.vertical.some(l=>Math.abs(l.x1-x)<1.5&&l.y1<=y+1&&l.y2>=y-1)
  const hasH=(y,x)=>region.horizontal.some(l=>Math.abs(l.y1-y)<1.5&&l.x1<=x+1&&l.x2>=x-1)
  const continued=new Map()
  for(let r=0;r<ys.length-1;r++){
    const cells=[]
    for(let c=0;c<xs.length-1;){let end=c+1;while(end<xs.length-1&&!hasV(xs[end],(ys[r]+ys[r+1])/2))end++
      const key=c+':'+end,center=(xs[c]+xs[end])/2,merge=r>0&&!hasH(ys[r],center)&&continued.get(key)
      let lastRow=r+1
      while(lastRow<ys.length-1&&!hasH(ys[lastRow],center))lastRow++
      const contents=merge?[]:collectPdfLines(fragments.filter(p=>p.x>=xs[c]-1&&p.x<xs[end]-1&&p.y>ys[r]&&p.y<=ys[lastRow]+1))
      const children=contents.length?contents.map((line,i)=>lineParagraph(line,xs[c]+(policy.tableExactGeometry?0:2),i?Math.max(0,line.top-contents[i-1].bottom):policy.tableExactGeometry?Math.max(0,line.top-ys[r]):0,policy)):[new Paragraph({spacing:{before:0,after:0,line:20,lineRule:LineRuleType.EXACT},children:[]})]
      const startsMerge=!hasH(ys[r+1],center)&&r<ys.length-2
      cells.push(new TableCell({columnSpan:end-c,verticalMerge:merge?VerticalMergeType.CONTINUE:startsMerge?VerticalMergeType.RESTART:undefined,width:{size:twips(xs[end]-xs[c]),type:WidthType.DXA},margins:policy.tableExactGeometry?{top:0,bottom:0,left:0,right:0}:{top:20,bottom:20,left:40,right:40},borders:{top:hasH(ys[r],center)?border:none,bottom:hasH(ys[r+1],center)?border:none,left:hasV(xs[c],(ys[r]+ys[r+1])/2)?border:none,right:hasV(xs[end],(ys[r]+ys[r+1])/2)?border:none},children}))
      continued.set(key,startsMerge||merge);c=end
    }
    rows.push(new TableRow({tableHeader:r<headerRows,height:{value:twips(ys[r+1]-ys[r]),rule:policy.tableExactGeometry?HeightRule.EXACT:HeightRule.ATLEAST},children:cells}))
  }
  return new Table({indent:{size:twips(Math.max(0,region.left-pageLeft)),type:WidthType.DXA},width:{size:twips(region.right-region.left),type:WidthType.DXA},columnWidths:xs.slice(1).map((x,i)=>twips(x-xs[i])),layout:TableLayoutType.FIXED,borders:{top:none,bottom:none,left:none,right:none,insideHorizontal:none,insideVertical:none},rows})
}

// Preserve isolated PDF fill-in rules as editable underlined Word spaces.
function restoreBlankRules(page) {
  const text = [...page.fragments]
  for (const rule of page.lines) {
    if (Math.abs(rule.y1-rule.y2) > .1 || rule.x2-rule.x1 < 8) continue
    const center = (rule.x1+rule.x2)/2
    const grid = page.lines.some(other => Math.abs(other.x1-other.x2)<.1 && (Math.abs(other.x1-rule.x1)<1.5 || Math.abs(other.x1-rule.x2)<1.5) && other.y1<=rule.y1+1 && other.y2>=rule.y1-1)
    if (grid) continue
    const nearby = text.filter(part => Math.abs(part.y-rule.y1)<5)
    // Existing text underlines (names or underscore glyphs) are already retained.
    if (nearby.some(part => part.x<=center && part.x+part.width>=center)) continue
    const anchor = nearby.sort((a,b)=>Math.abs(a.y-rule.y1)-Math.abs(b.y-rule.y1))[0]
    if (!anchor) continue
    const size = anchor.size
    const spaceWidth = size * (anchor.font==='Arial' ? .278 : .25)
    const width = rule.x2-rule.x1
    page.fragments.push({str:' '.repeat(Math.max(1,Math.round(width/spaceWidth))),x:rule.x1,y:anchor.y,top:anchor.top,bottom:anchor.bottom,width,size,font:anchor.font,bold:false,italics:false,underline:true,color:'000000'})
  }
}

// Converts the generated reference into native tables and individually editable styled runs.
// Page images are deliberately not supported here.
export async function pdfTextToWord(source, name, number, onPage = () => {}, policy = {}) {
  const pages=await readPdfLayout(source,name),sections=[]
  for(let index=0;index<pages.length;index++){
    const page=pages[index]
    if(policy.preserveBlankLines)restoreBlankRules(page)
    if(policy.preparePage)policy.preparePage(page,index)
    const regions=policy.tables===false?[]:tableRegions(page.lines)
    const left=Math.max(12,Math.min(...page.fragments.map(p=>p.x),...regions.map(r=>r.left)))
    const right=Math.max(...page.fragments.map(p=>p.x+p.width),...regions.map(r=>r.right))
    const marginRight=Math.max(12,page.width-right-(policy.rightAllowance??3))
    const firstTop=Math.min(...page.fragments.map(p=>p.top),...regions.map(r=>r.top))
    const top=Math.max(12,firstTop-2)
    const inTable=part=>regions.some(r=>part.x>=r.left-1&&part.x<r.right+1&&part.y>r.top&&part.y<r.bottom+1)
    const lines=collectPdfLines(page.fragments.filter(p=>!inTable(p)))
    const blocks=[...lines.map(line=>({top:line.top,bottom:line.bottom,line})),...regions.map(region=>({top:region.top,bottom:region.bottom,region}))].sort((a,b)=>a.top-b.top)
    const children=index===0?[new Paragraph({children:[sectionMarker(number)],spacing:{before:0,after:0,line:1,lineRule:LineRuleType.EXACT}})]:[];let cursor=top
    for(const block of blocks){
      const before=Math.max(0,block.top-cursor)
      if(block.region){if(before>0)children.push(new Paragraph({spacing:{before:0,after:0,line:twips(before),lineRule:LineRuleType.EXACT},children:[]}));children.push(buildTable(block.region,page.fragments,policy.headerRows??1,left,policy))}
      else {const para=lineParagraph(block.line,left,before,policy);children.push(para)}
      cursor=block.bottom
    }
    if(!children.length)throw new Error(name+': empty editable page')
    sections.push({properties:{type:SectionType.NEXT_PAGE,page:{size:{width:twips(Math.min(page.width,page.height)),height:twips(Math.max(page.width,page.height)),orientation:page.width>page.height?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin:{top:twips(top),bottom:240,left:twips(left),right:twips(marginRight)}}},children})
    onPage(index+1,pages.length)
  }
  return sections
}
