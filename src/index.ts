import { WebSocketServer, WebSocket } from "ws";

const ws=new WebSocketServer({port:8080});

interface Room{
    socket:WebSocket;
    room:string
}

let allSockets: Room[]=[];

ws.on("connection",(socket)=>{
    
    socket.on("message",(msg)=>{
        //@ts-ignore
        const obj=JSON.parse(msg);

        if(obj.type === "join"){ 
            allSockets.push({
                socket,
                room:obj.payload.roomId
            })
            console.log("device joined room "+obj.payload.roomId);
        }

        if(obj.type === "chat"){
            let currentRoom=null;
            for(let i=0;i<allSockets.length;i++){
                if(allSockets[i].socket==socket) currentRoom=allSockets[i].room;
            }  
            
            for(let i=0;i<allSockets.length;i++){
                if(allSockets[i].room == currentRoom) allSockets[i].socket.send(obj.payload.msg);
            }

            console.log("device chat!!");
        }
    })

    socket.on("close",()=>{
        allSockets=allSockets.filter(x=>{
            x.socket!=socket;
        })
        console.log(`remaining devices: ${allSockets.length}`);
    })
})