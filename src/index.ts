import FastPriorityQueue from "fastpriorityqueue";
import { WebSocketServer, WebSocket } from "ws";

const ws=new WebSocketServer({port:8080});

interface randomChat{
    socket: WebSocket;
    deviceId: string;
    timestamp: number;
}

const roomMap=new Map<WebSocket , string>();
const pq=new FastPriorityQueue<randomChat>((d1,d2) => d1.timestamp<d2.timestamp);
const deviceMap=new Map<WebSocket, string>();

function generateUniqueId(){
    return Math.random().toString(36).substring(2,9);
}

ws.on("connection",(socket)=>{
    const deviceId=generateUniqueId();
    deviceMap.set(socket,deviceId);

    socket.on("message",(msg)=>{
        let obj;
        try{
            obj=JSON.parse(msg.toString());
        }
        catch(err){
            console.log(`Error: ${err}`);
            return;
        }

        if(obj.type === "join"){ 
            roomMap.set(socket,obj.payload.roomId);
            console.log(`device joined room ${obj.payload.roomId}!`);
        }

        if(obj.type === "chat"){
            const currRoom=roomMap.get(socket);
            if(!currRoom) return;

            for(const [device,room] of roomMap.entries()){
                if(room==currRoom && device.readyState===WebSocket.OPEN){
                    // device.send(obj.payload.msg);
                    device.send(JSON.stringify({
                        type:"chat",
                        payload:{
                            msg:obj.payload.msg
                        }
                    }))
                }
            }

            console.log(`Device sent message`);
        }

        if(obj.type==="random-connect"){
            pq.add({
                socket,
                deviceId,
                timestamp:Date.now()
            });

            pairDevices();
        }

        if(obj.type==="random-chat"){
            const currentDevice=obj.payload.currentId;
            const currentSocket=[...deviceMap.entries()].find(([_,id]) => id==currentDevice)?.[0];

            if(currentSocket && currentSocket.readyState===WebSocket.OPEN){
                currentSocket.send(JSON.stringify({
                    type:"random-chat",
                    payload:{
                        msg:obj.payload.msg
                    }
                }))
            }

            const targetDevice=obj.payload.pairId;
            const targetSocket=[...deviceMap.entries()].find(([_,id]) => id===targetDevice)?.[0];

            if(targetSocket && targetSocket.readyState===WebSocket.OPEN){
                targetSocket.send(JSON.stringify({
                    type:"random-chat",
                    payload:{
                        msg:obj.payload.msg
                    }
                }))
            }

            
        }

    })

    socket.on("close",()=>{
        roomMap.delete(socket);
        deviceMap.delete(socket);
        console.log(`remaining devices are ${roomMap.size}`);
    })
})

function pairDevices(){
    while(pq.size>=2){
        const device1=pq.poll();
        const device2=pq.poll();

        if(!device1 || !device2) return;

        device1.socket.send(JSON.stringify({
            type:"paired-device",
            payload:{
                currentId:device1.deviceId,
                pairId:device2.deviceId
            }
        }))

        device2.socket.send(JSON.stringify({
            type:"paired-device",
            payload:{
                currentId:device2.deviceId,
                pairId:device1.deviceId
            }
        }))
    }
}