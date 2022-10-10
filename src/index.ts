import { Protocol, RawSocket } from "./lib/raw-socket";

console.log('START');
const udp = RawSocket.createSocket({ protocol: Protocol.UDP });
const tcp = RawSocket.createSocket({ protocol: Protocol.TCP });
