/**
 * Shared Program Data
 * Used by both main programs page and program detail page
 */

(function() {
  'use strict';
  
  // Program data - 20 rows with H + 2 random numbers in descending order
  // Each program has nested sites data
  // Phase sequence: Planning, Preparation, Installation, Opening, Dismantling
  const programsData = [
    {
      code: 'EX01',
      name: 'São Paulo',
      state: 'SP',
      admin: 'Lucas Silva',
      lastUpdate: '19 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Pinheiros', alias: 'RENM-2024', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '19 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '05 Jul 2026', status: 'On track', progress: 8, lead: 'Marina Costa' },
        { site: 'Moema', alias: 'RENM-PRO', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '16 Feb 2026', favorite: true, currentPhase: 'Opening', openingDate: '06 Mar 2026', status: 'At risk', progress: 87, lead: 'Tiago Nunes' },
        { site: 'Tatuapé', alias: 'RENM-DEV', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '13 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '01 Jun 2026', status: 'On track', progress: 44, lead: 'Isabela Ramos' },
        { site: 'Vila Mariana', alias: 'RENM-MET', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '19 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '02 Dec 2025', status: 'On track', progress: 98, lead: 'Diego Martins' },
        { site: 'Santana', alias: 'RENM-POMP', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '16 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '28 Apr 2026', status: 'On track', progress: 55, lead: 'Larissa Gomes' }
      ]
    },
    {
      code: 'EX02',
      name: 'Rio de Janeiro',
      state: 'RJ',
      admin: 'Ana Santos',
      lastUpdate: '15 Feb 2026',
      favorite: true,
      sites: [
        { site: 'Copacabana', alias: 'IMPL-MAX', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '15 Feb 2026', favorite: true, currentPhase: 'Preparation', openingDate: '11 May 2026', status: 'At risk', progress: 46, lead: 'Rafael Lima' },
        { site: 'Tijuca', alias: 'IMPL-PRO', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '12 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '11 Dec 2025', status: 'On track', progress: 95, lead: 'Beatriz Moreira' },
        { site: 'Barra da Tijuca', alias: 'IMPL-TATE', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '09 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '07 Apr 2026', status: 'On track', progress: 53, lead: 'Henrique Teixeira' },
        { site: 'Botafogo', alias: 'IMPL-GUGG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '15 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '08 Aug 2026', status: 'On track', progress: 22, lead: 'Helena Duarte' }
      ]
    },
    {
      code: 'EX03',
      name: 'Belo Horizonte',
      state: 'MG',
      admin: 'Pedro Oliveira',
      lastUpdate: '11 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Savassi', alias: 'MSCU-AIR', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '11 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '26 Feb 2026', status: 'Delayed', progress: 83, lead: 'Gustavo Pinto' },
        { site: 'Funcionários', alias: 'MSCU-V5', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '08 Feb 2026', favorite: true, currentPhase: 'Installation', openingDate: '17 Mar 2026', status: 'At risk', progress: 51, lead: 'Camila Rocha' },
        { site: 'Pampulha', alias: 'MSCU-DEV', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '05 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '08 Jul 2026', status: 'On track', progress: 22, lead: 'Felipe Araújo' },
        { site: 'Buritis', alias: 'MSCU-HERM', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '11 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '28 Dec 2025', status: 'On track', progress: 89, lead: 'Marina Costa' },
        { site: 'Lourdes', alias: 'MSCU-VATI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '08 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '24 Jun 2026', status: 'Delayed', progress: 45, lead: 'Tiago Nunes' }
      ]
    },
    {
      code: 'EX04',
      name: 'Salvador',
      state: 'BA',
      admin: 'Maria Costa',
      lastUpdate: '07 Feb 2026',
      favorite: true,
      sites: [
        { site: 'Pituba', alias: 'ANCE-PRO', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '07 Feb 2026', favorite: true, currentPhase: 'Dismantling', openingDate: '25 Nov 2025', status: 'On track', progress: 97, lead: 'Isabela Ramos' },
        { site: 'Barra', alias: 'ANCE-2', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '04 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '05 Feb 2026', status: 'On track', progress: 80, lead: 'Diego Martins' },
        { site: 'Itapuã', alias: 'ANCE-POMP', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '01 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '03 Jun 2026', status: 'On track', progress: 47, lead: 'Larissa Gomes' },
        { site: 'Rio Vermelho', alias: 'ANCE-ORSY', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '07 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '04 Dec 2025', status: 'On track', progress: 100, lead: 'Rafael Lima' }
      ]
    },
    {
      code: 'EX05',
      name: 'Brasília',
      state: 'DF',
      admin: 'João Ferreira',
      lastUpdate: '03 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Asa Sul', alias: 'MARV-V9', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '03 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '30 Apr 2026', status: 'At risk', progress: 61, lead: 'Beatriz Moreira' },
        { site: 'Asa Norte', alias: 'MARV-VOL9', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '31 Jan 2026', favorite: true, currentPhase: 'Planning', openingDate: '11 Aug 2026', status: 'On track', progress: 15, lead: 'Henrique Teixeira' },
        { site: 'Lago Sul', alias: 'MARV-GUGG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '28 Jan 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '13 Dec 2025', status: 'On track', progress: 97, lead: 'Helena Duarte' },
        { site: 'Taguatinga', alias: 'MARV-SOFI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '03 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '09 Apr 2026', status: 'On track', progress: 59, lead: 'Gustavo Pinto' }
      ]
    },
    {
      code: 'EX06',
      name: 'Curitiba',
      state: 'PR',
      admin: 'Beatriz Almeida',
      lastUpdate: '30 Jan 2026',
      favorite: false,
      sites: [
        { site: 'Batel', alias: 'URBP-V2', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '30 Jan 2026', favorite: false, currentPhase: 'Planning', openingDate: '11 Jul 2026', status: 'At risk', progress: 15, lead: 'Camila Rocha' },
        { site: 'Água Verde', alias: 'URBP-PRO', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '27 Jan 2026', favorite: false, currentPhase: 'Opening', openingDate: '06 Mar 2026', status: 'On track', progress: 91, lead: 'Felipe Araújo' },
        { site: 'Santa Felicidade', alias: 'URBP-VATI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '24 Jan 2026', favorite: false, currentPhase: 'Preparation', openingDate: '18 May 2026', status: 'On track', progress: 46, lead: 'Marina Costa' },
        { site: 'Portão', alias: 'URBP-PERG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '30 Jan 2026', favorite: false, currentPhase: 'Planning', openingDate: '19 Aug 2026', status: 'On track', progress: 15, lead: 'Tiago Nunes' }
      ]
    },
    {
      code: 'EX07',
      name: 'Porto Alegre',
      state: 'RS',
      admin: 'Carlos Rodrigues',
      lastUpdate: '26 Jan 2026',
      favorite: true,
      sites: [
        { site: 'Moinhos de Vento', alias: 'BARG-STD', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '26 Jan 2026', favorite: true, currentPhase: 'Opening', openingDate: '23 Feb 2026', status: 'At risk', progress: 82, lead: 'Isabela Ramos' },
        { site: 'Menino Deus', alias: 'BARG-BASE', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '23 Jan 2026', favorite: false, currentPhase: 'Preparation', openingDate: '26 Jun 2026', status: 'At risk', progress: 48, lead: 'Diego Martins' },
        { site: 'Petrópolis', alias: 'BARG-DEV', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '20 Jan 2026', favorite: true, currentPhase: 'Dismantling', openingDate: '27 Nov 2025', status: 'On track', progress: 99, lead: 'Larissa Gomes' },
        { site: 'Cidade Baixa', alias: 'BARG-ORSY', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '26 Jan 2026', favorite: false, currentPhase: 'Installation', openingDate: '24 Mar 2026', status: 'On track', progress: 69, lead: 'Rafael Lima' },
        { site: 'Bom Fim', alias: 'BARG-VGOG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '23 Jan 2026', favorite: false, currentPhase: 'Preparation', openingDate: '05 Jun 2026', status: 'Delayed', progress: 31, lead: 'Beatriz Moreira' }
      ]
    },
    {
      code: 'EX08',
      name: 'Recife',
      state: 'PE',
      admin: 'Juliana Souza',
      lastUpdate: '17 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Boa Viagem', alias: 'SURD-V2', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '17 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '06 Dec 2025', status: 'On track', progress: 96, lead: 'Henrique Teixeira' },
        { site: 'Casa Forte', alias: 'SURD-2024', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '14 Feb 2026', favorite: true, currentPhase: 'Installation', openingDate: '02 May 2026', status: 'On track', progress: 67, lead: 'Helena Duarte' },
        { site: 'Espinheiro', alias: 'SURD-SOFI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '11 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '14 Jul 2026', status: 'On track', progress: 8, lead: 'Gustavo Pinto' },
        { site: 'Graças', alias: 'SURD-MET', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '17 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '01 Mar 2026', status: 'Delayed', progress: 93, lead: 'Camila Rocha' }
      ]
    },
    {
      code: 'EX09',
      name: 'Fortaleza',
      state: 'CE',
      admin: 'Rafael Lima',
      lastUpdate: '13 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Aldeota', alias: 'CONF-PRO', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '13 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '11 Apr 2026', status: 'At risk', progress: 65, lead: 'Felipe Araújo' },
        { site: 'Meireles', alias: 'CONF-V12', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '10 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '22 Aug 2026', status: 'On track', progress: 8, lead: 'Marina Costa' },
        { site: 'Cocó', alias: 'CONF-PERG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '07 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '22 Jan 2026', status: 'On track', progress: 84, lead: 'Tiago Nunes' },
        { site: 'Messejana', alias: 'CONF-TATE', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '13 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '20 May 2026', status: 'Delayed', progress: 30, lead: 'Isabela Ramos' }
      ]
    },
    {
      code: 'EX10',
      name: 'Manaus',
      state: 'AM',
      admin: 'Fernanda Martins',
      lastUpdate: '09 Feb 2026',
      favorite: true,
      sites: [
        { site: 'Adrianópolis', alias: 'SILP-2024', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '09 Feb 2026', favorite: true, currentPhase: 'Dismantling', openingDate: '20 Dec 2025', status: 'On track', progress: 98, lead: 'Diego Martins' },
        { site: 'Ponta Negra', alias: 'SILP-PRO', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '06 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '02 Mar 2026', status: 'On track', progress: 90, lead: 'Larissa Gomes' },
        { site: 'Cidade Nova', alias: 'SILP-VGOG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '03 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '28 Jun 2026', status: 'On track', progress: 32, lead: 'Rafael Lima' },
        { site: 'Flores', alias: 'SILP-HERM', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '09 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '29 Nov 2025', status: 'On track', progress: 95, lead: 'Beatriz Moreira' }
      ]
    },
    {
      code: 'EX11',
      name: 'Belém',
      state: 'PA',
      admin: 'Gabriel Pereira',
      lastUpdate: '05 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Nazaré', alias: 'DIGH-V2', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '05 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '26 Mar 2026', status: 'At risk', progress: 52, lead: 'Henrique Teixeira' },
        { site: 'Umarizal', alias: 'DIGH-MAX', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '02 Feb 2026', favorite: true, currentPhase: 'Planning', openingDate: '17 Jul 2026', status: 'On track', progress: 22, lead: 'Helena Duarte' },
        { site: 'Batista Campos', alias: 'DIGH-MET', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '30 Jan 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '08 Dec 2025', status: 'On track', progress: 98, lead: 'Gustavo Pinto' },
        { site: 'Marco', alias: 'DIGH-POMP', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '05 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '04 May 2026', status: 'On track', progress: 50, lead: 'Camila Rocha' }
      ]
    },
    {
      code: 'EX12',
      name: 'Goiânia',
      state: 'GO',
      admin: 'Camila Ribeiro',
      lastUpdate: '01 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Setor Bueno', alias: 'TEXT-STD', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '01 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '25 Aug 2026', status: 'At risk', progress: 22, lead: 'Felipe Araújo' },
        { site: 'Setor Marista', alias: 'TEXT-BASE', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '29 Jan 2026', favorite: false, currentPhase: 'Opening', openingDate: '01 Mar 2026', status: 'At risk', progress: 86, lead: 'Marina Costa' },
        { site: 'Jardim Goiás', alias: 'TEXT-TATE', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '26 Jan 2026', favorite: false, currentPhase: 'Preparation', openingDate: '12 Jun 2026', status: 'On track', progress: 31, lead: 'Tiago Nunes' },
        { site: 'Campinas', alias: 'TEXT-GUGG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '01 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '25 Jul 2026', status: 'On track', progress: 22, lead: 'Isabela Ramos' }
      ]
    },
    {
      code: 'EX13',
      name: 'Campinas',
      state: 'SP',
      admin: 'Bruno Carvalho',
      lastUpdate: '28 Jan 2026',
      favorite: true,
      sites: [
        { site: 'Cambuí', alias: 'CINO-4K', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '28 Jan 2026', favorite: true, currentPhase: 'Opening', openingDate: '26 Feb 2026', status: 'Delayed', progress: 92, lead: 'Diego Martins' },
        { site: 'Taquaral', alias: 'CINO-2024', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '25 Jan 2026', favorite: false, currentPhase: 'Preparation', openingDate: '22 May 2026', status: 'At risk', progress: 33, lead: 'Larissa Gomes' },
        { site: 'Barão Geraldo', alias: 'CINO-HERM', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '22 Jan 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '22 Dec 2025', status: 'On track', progress: 100, lead: 'Rafael Lima' },
        { site: 'Guanabara', alias: 'CINO-VATI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '28 Jan 2026', favorite: false, currentPhase: 'Installation', openingDate: '18 Apr 2026', status: 'On track', progress: 60, lead: 'Beatriz Moreira' }
      ]
    },
    {
      code: 'EX14',
      name: 'Florianópolis',
      state: 'SC',
      admin: 'Patricia Gomes',
      lastUpdate: '19 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Trindade', alias: 'SNDS-2', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '19 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '30 Jun 2026', status: 'Delayed', progress: 35, lead: 'Henrique Teixeira' },
        { site: 'Lagoa da Conceição', alias: 'SNDS-GEN2', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '16 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '01 Dec 2025', status: 'On track', progress: 97, lead: 'Helena Duarte' },
        { site: 'Ingleses', alias: 'SNDS-POMP', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '13 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '28 Mar 2026', status: 'On track', progress: 58, lead: 'Gustavo Pinto' },
        { site: 'Campeche', alias: 'SNDS-ORSY', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '19 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '28 Aug 2026', status: 'On track', progress: 15, lead: 'Camila Rocha' }
      ]
    },
    {
      code: 'EX15',
      name: 'Vitória',
      state: 'ES',
      admin: 'Ricardo Barbosa',
      lastUpdate: '15 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Praia do Canto', alias: 'POPA-24', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '15 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '04 Mar 2026', status: 'Delayed', progress: 88, lead: 'Felipe Araújo' },
        { site: 'Jardim da Penha', alias: 'POPA-V3', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '12 Feb 2026', favorite: true, currentPhase: 'Installation', openingDate: '07 Mar 2026', status: 'At risk', progress: 56, lead: 'Marina Costa' },
        { site: 'Enseada do Suá', alias: 'POPA-GUGG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '09 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '28 Jul 2026', status: 'On track', progress: 15, lead: 'Tiago Nunes' },
        { site: 'Jardim Camburi', alias: 'POPA-SOFI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '15 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '16 Feb 2026', status: 'On track', progress: 94, lead: 'Isabela Ramos' }
      ]
    },
    {
      code: 'EX16',
      name: 'Natal',
      state: 'RN',
      admin: 'Larissa Dias',
      lastUpdate: '11 Feb 2026',
      favorite: true,
      sites: [
        { site: 'Tirol', alias: 'CALA-2024', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '11 Feb 2026', favorite: true, currentPhase: 'Preparation', openingDate: '14 Jun 2026', status: 'On track', progress: 34, lead: 'Diego Martins' },
        { site: 'Capim Macio', alias: 'CALA-PRO', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '08 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '15 Dec 2025', status: 'On track', progress: 99, lead: 'Larissa Gomes' },
        { site: 'Lagoa Nova', alias: 'CALA-VATI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '05 Feb 2026', favorite: false, currentPhase: 'Opening', openingDate: '11 Jan 2026', status: 'On track', progress: 85, lead: 'Rafael Lima' },
        { site: 'Candelária', alias: 'CALA-PERG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '11 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '24 May 2026', status: 'On track', progress: 36, lead: 'Beatriz Moreira' }
      ]
    },
    {
      code: 'EX17',
      name: 'São Luís',
      state: 'MA',
      admin: 'Thiago Araujo',
      lastUpdate: '07 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Renascença', alias: 'CERH-2', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '07 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '24 Nov 2025', status: 'On track', progress: 96, lead: 'Henrique Teixeira' },
        { site: 'Calhau', alias: 'CERH-BLK', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '04 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '20 Apr 2026', status: 'At risk', progress: 66, lead: 'Helena Duarte' },
        { site: 'Cohama', alias: 'CERH-ORSY', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '01 Feb 2026', favorite: false, currentPhase: 'Planning', openingDate: '31 Aug 2026', status: 'At risk', progress: 8, lead: 'Gustavo Pinto' },
        { site: 'São Francisco', alias: 'CERH-VGOG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '07 Feb 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '03 Dec 2025', status: 'On track', progress: 99, lead: 'Camila Rocha' }
      ]
    },
    {
      code: 'EX18',
      name: 'Campo Grande',
      state: 'MS',
      admin: 'Amanda Rocha',
      lastUpdate: '03 Feb 2026',
      favorite: false,
      sites: [
        { site: 'Carandá Bosque', alias: 'ABSV-STD', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '03 Feb 2026', favorite: false, currentPhase: 'Installation', openingDate: '30 Mar 2026', status: 'On track', progress: 64, lead: 'Felipe Araújo' },
        { site: 'Jardim dos Estados', alias: 'ABSV-BASE', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '31 Jan 2026', favorite: true, currentPhase: 'Planning', openingDate: '31 Jul 2026', status: 'Delayed', progress: 8, lead: 'Marina Costa' },
        { site: 'Tiradentes', alias: 'ABSV-SOFI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '28 Jan 2026', favorite: false, currentPhase: 'Opening', openingDate: '04 Mar 2026', status: 'At risk', progress: 81, lead: 'Tiago Nunes' },
        { site: 'Santa Fé', alias: 'ABSV-MET', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '03 Feb 2026', favorite: false, currentPhase: 'Preparation', openingDate: '08 May 2026', status: 'On track', progress: 35, lead: 'Isabela Ramos' }
      ]
    },
    {
      code: 'EX19',
      name: 'Cuiabá',
      state: 'MT',
      admin: 'Felipe Cardoso',
      lastUpdate: '30 Jan 2026',
      favorite: true,
      sites: [
        { site: 'Goiabeiras', alias: 'FOLK-MINI', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '30 Jan 2026', favorite: true, currentPhase: 'Planning', openingDate: '08 Sep 2026', status: 'On track', progress: 8, lead: 'Diego Martins' },
        { site: 'Jardim Aclimação', alias: 'FOLK-V6', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '27 Jan 2026', favorite: false, currentPhase: 'Opening', openingDate: '01 Mar 2026', status: 'Delayed', progress: 87, lead: 'Larissa Gomes' },
        { site: 'Santa Rosa', alias: 'FOLK-PERG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '24 Jan 2026', favorite: false, currentPhase: 'Preparation', openingDate: '16 Jun 2026', status: 'At risk', progress: 37, lead: 'Rafael Lima' },
        { site: 'Coxipó', alias: 'FOLK-TATE', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '30 Jan 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '17 Dec 2025', status: 'On track', progress: 95, lead: 'Beatriz Moreira' }
      ]
    },
    {
      code: 'EX20',
      name: 'João Pessoa',
      state: 'PB',
      admin: 'Isabela Mendes',
      lastUpdate: '26 Jan 2026',
      favorite: false,
      sites: [
        { site: 'Manaíra', alias: 'HIDT-2024', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '26 Jan 2026', favorite: false, currentPhase: 'Installation', openingDate: '14 Mar 2026', status: 'On track', progress: 51, lead: 'Henrique Teixeira' },
        { site: 'Tambaú', alias: 'HIDT-GEN1', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '23 Jan 2026', favorite: false, currentPhase: 'Preparation', openingDate: '26 May 2026', status: 'Delayed', progress: 39, lead: 'Helena Duarte' },
        { site: 'Bessa', alias: 'HIDT-VGOG', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '20 Jan 2026', favorite: false, currentPhase: 'Dismantling', openingDate: '26 Nov 2025', status: 'On track', progress: 98, lead: 'Gustavo Pinto' },
        { site: 'Altiplano', alias: 'HIDT-HERM', builds: 'Planning, Preparation, Installation, Opening, Dismantling', lastUpdate: '26 Jan 2026', favorite: false, currentPhase: 'Installation', openingDate: '22 Apr 2026', status: 'On track', progress: 72, lead: 'Camila Rocha' }
      ]
    }
  ];

  // Derived figures: region per state, and per-store code, address, operational counters and a store-friendly status label
  var REGION_BY_STATE = {
    SP: 'Sudeste', RJ: 'Sudeste', MG: 'Sudeste', ES: 'Sudeste',
    PR: 'Sul', RS: 'Sul', SC: 'Sul',
    BA: 'Nordeste', PE: 'Nordeste', CE: 'Nordeste', RN: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste',
    AM: 'Norte', PA: 'Norte',
    DF: 'Centro-Oeste', GO: 'Centro-Oeste', MS: 'Centro-Oeste', MT: 'Centro-Oeste'
  };
  var STREETS = ['Av. Brasil', 'Rua XV de Novembro', 'Rua das Palmeiras', 'Av. Getúlio Vargas', 'Rua Sete de Setembro', 'Av. Independência', 'Rua Marechal Deodoro', 'Av. Presidente Vargas'];
  var STATUS_LABEL = { 'On track': 'Normal', 'At risk': 'Attention', 'Delayed': 'Critical' };
  // [low stock, overdue tasks, blocked tasks] base per status; a small per-store offset keeps the numbers varied
  var LOAD = { 'On track': [8, 0, 0], 'At risk': [20, 2, 1], 'Delayed': [34, 4, 2] };
  var SUPPLIERS = ['Good Harvest Farm', 'Blue Ridge Dairy', 'Atlantic Distribution', 'Green Valley Produce', 'Coastal Beverages', 'Trigal Industrial Bakery'];
  var storeNumber = 0;

  programsData.forEach(function(p, i) {
    p.region = REGION_BY_STATE[p.state] || '';
    p.sites.forEach(function(s, j) {
      var base = LOAD[s.status] || LOAD['On track'], off = (i * 7 + j * 3) % 4;
      storeNumber += 1;
      s.storeName = s.site;
      s.storeCode = 'BN-' + String(storeNumber).padStart(3, '0');
      s.address = STREETS[(i + j) % STREETS.length] + ', ' + (100 + ((i * 53 + j * 37) % 900));
      s.lowStock = base[0] ? base[0] + off : (off > 2 ? 2 : off % 2);
      s.overdueTasks = base[1] ? base[1] + (off % 2) : 0;
      s.blockedTasks = base[2] ? base[2] + (off > 2 ? 1 : 0) : 0;
      s.statusLabel = STATUS_LABEL[s.status] || s.status;
      s.lateOrders = s.status === 'Delayed' ? 1 + (off % 2) : (s.status === 'At risk' && off > 1 ? 1 : 0);
      s.pendingOrders = s.lateOrders + 1 + (off % 3);
      s.equipmentDown = s.status === 'Delayed' ? 1 + (off % 2) : (s.status === 'At risk' ? off % 2 : 0);
      s.supplier = SUPPLIERS[(i + j) % SUPPLIERS.length];
      s.productCount = 360 + ((i * 17 + j * 11) % 90);
      s.outOfStock = s.lowStock > 1 ? Math.min(s.lowStock, Math.round(s.lowStock * 0.25) + (off > 2 ? 1 : 0)) : 0;
      s.stockoutRisk = s.lowStock ? Math.max(1, Math.round(s.lowStock * 0.5) + (off % 2)) : (off > 2 ? 1 : 0);
      s.expiringSoon = s.status === 'Delayed' ? 6 + off : (s.status === 'At risk' ? 3 + (off % 3) : off % 3);
      s.nextDelivery = s.openingDate;
    });
    p.museumCount = p.sites.length;
    p.atRiskCount = p.sites.filter(function(s) { return s.status === 'At risk' || s.status === 'Delayed'; }).length;
  });

  // Export to global scope
  window.ProgramsData = {
    getAll: function() {
      return programsData;
    },
    findByCode: function(code) {
      return programsData.find(p => p.code === code);
    },
    suppliers: SUPPLIERS,
    add: function(program) {
      programsData.unshift(program);
    }
  };
})();
