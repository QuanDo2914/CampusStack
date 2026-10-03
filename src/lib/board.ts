export interface Space {shortName?:string;index:number;name:string;kind:'start'|'property'|'event'|'fee';category:string;price:number;rent:number;fee:number}
export const board:Space[]=[
 [0,'START','start','start',0,0,0],[1,'Engineering Cafe','property','food',180,35,0],[2,'Bike Hub','property','wellness',140,25,0],
 [3,'Campus Bulletin','event','event',0,0,0],[4,'Innovation Lab','property','innovation',300,65,0],[5,'Music Hall','property','arts',200,40,0],
 [6,'Campus Gym','property','wellness',220,45,0],[7,'Lab Materials','fee','fee',0,0,60],[8,'Student Apartments','property','housing',320,70,0],
 [9,'Art Studio','property','arts',160,30,0],[10,'Green Street Pizza','property','food',240,50,0],[11,'Student Union','event','event',0,0,0],
 [12,'Tech Park','property','innovation',360,80,0],[13,'Study Commons','property','housing',200,40,0],[14,'Library Cafe','property','food',180,35,0],
 [15,'Club Dues','fee','fee',0,0,50],[16,'Recreation Center','property','wellness',260,55,0],[17,'Makerspace','property','innovation',280,60,0],
 [18,'Campus Market','property','food',160,30,0],[19,'Quad Noticeboard','event','event',0,0,0]
].map(([index,name,kind,category,price,rent,fee])=>({index,name,kind,category,price,rent,fee}) as Space);
export const colors=['#1c7857','#ea7b37','#6959bc','#277fc0'];
// START sits halfway down the left edge. No designated corner spaces.
export function gridPosition(index:number):[number,number]{
 const path:[number,number][]=[[1,3],[1,2],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[7,2],[7,3],[7,4],[7,5],[6,5],[5,5],[4,5],[3,5],[2,5],[1,5],[1,4]];
 return path[index];
}
export const money=(amount:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(amount);

const compactNames:Record<number,string>={1:'Eng. Cafe',3:'News',4:'Innov. Lab',6:'Gym',8:'Student Apts',10:'Green St. Pizza',13:'Study Hub',14:'Lib. Cafe',16:'Rec Center',17:'Maker Space',18:'Market',19:'Quad News'};
board.forEach(space=>{space.shortName=compactNames[space.index];});
