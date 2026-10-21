import {installRiverSoilLayerV2Route} from './qa-river-soil-layer-v2-route.mjs';
export async function installRiverSoilEarlyRoute(page,enabled){await installRiverSoilLayerV2Route(page,true,{earlyExit:enabled});}
