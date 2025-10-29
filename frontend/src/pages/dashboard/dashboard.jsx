import React from "react";
import { LoadQueueProvider } from "../../components/LoadQueueContext/LoadQueueContext";
import Faturamentosimples from "../../components/faturamentosimples/faturamentosimples";
import Ticketmediosimples from "../../components/ticketmediosimples/ticketmediosimples"
import Vendastotaismensais from "../../components/vendastotaismensais/vendastotaismensais"
import Tempomedioentregas from "../../components/tempomedioentregas/tempomedioentregas"
import Vendascanais from "../../components/vendascanais/vendascanais"
import Produtosmaisvendidos from "../../components/produtosmaisvendidos/produtosmaisvendidos"
import FaturamentoPorLoja from "../../components/FaturamentoPorLoja/FaturamentoPorLoja"
import './Dashboard.css'

function Dashboard(){

    return(
        <LoadQueueProvider>
        <div className="Faturamentosimples">
            <Faturamentosimples/>
            <Ticketmediosimples queueIndex={0} />
            <Vendascanais queueIndex={0} />   
            <Produtosmaisvendidos queueIndex={2} />
            <Vendastotaismensais queueIndex={3} />
            <Tempomedioentregas queueIndex={4} />
            <FaturamentoPorLoja queueIndex={5} />

        </div>
      </LoadQueueProvider>
    );
}

export default Dashboard;