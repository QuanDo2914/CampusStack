import { campusBoard, groups, tilePosition } from '../../lib/expanded';
import { colors } from '../../lib/board';
import { diamondFacePath } from './diamondGeometry';
import type { Snapshot } from '../../types/game';
// Paint the entire surface beneath every label/piece. Individual interactive
// polygons remain in BoardTile, avoiding neighboring background occlusion.
export function DiamondSurface({ snapshot }: { snapshot: Snapshot }) {
  return <svg className="diamond-surface" viewBox="0 0 1100 1100" preserveAspectRatio="none" aria-hidden="true">
    {campusBoard.map(b=>{
      const [col,row]=tilePosition(b.index),edge=row===1?'top':row===11?'bottom':col===1?'left':'right';
      const owner=snapshot.players.find(p=>p.id===snapshot.assets?.[b.index]?.owner);
      return <g key={b.index} className={`kind-${b.kind} ${b.index%10===0?'corner':''}`} transform={`translate(${500+(col-row)*50} ${(col+row-2)*50})`} style={{'--group':groups.find(g=>g.id===b.category)?.color || '#679587','--owner':owner?colors[owner.seat]:'transparent'} as React.CSSProperties}>
        <path className="tile-rim" d={diamondFacePath(b.index,edge)}/>
        <path className="district-edge" d="M5 50 50 5 95 50"/>
        <path className="owner-edge" d="M5 52 50 97 95 52"/>
      </g>;
    })}
  </svg>;
}
