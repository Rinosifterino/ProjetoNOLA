import {useState} from "react";

function pageSwitcher(paginaInicial = 1){

  const[pageAtual,setpageAtual] = useState(paginaInicial); 

  const irParaPaginaDashboard = ()=> {
     if(pageAtual !== 1){
    setpageAtual(1)
  }}

  const irParaPaginaCustom = () => {
    if(pageAtual !== 2){
    setpageAtual(2)
  }}

  return{
    pageAtual,
    irParaPaginaDashboard,
    irParaPaginaCustom
  };
}

export default pageSwitcher