/** Única fonte da marca oficial usada em todo o Vertex Hub. */
export function OfficialLogo({className=""}:{className?:string}){
  return <img src="/assets/vertex-logo.png" alt="Vertex" className={`object-contain ${className}`} draggable={false}/>;
}
