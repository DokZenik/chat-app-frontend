import {useState} from "react";
import {over} from "stompjs";
import SockJS from "sockjs-client";

let path = "http://localhost:8080/chat"
let stompClient = null;

const ChatRoom = () => {
    const [data, setData] = useState({
        username: "",
        receiverName: "",
        connected: false,
        message: ""
    });
    const [name, setName] = useState("");
    const [publicChat, setPublicChat] = useState([]);


    const handleValue = (event) => {
        const {value, name} = event.target;
        setData({...data, [name]: value})
    }


    const onConnected = () => {
        setData({...data, connected: true})
        stompClient.subscribe("/chatroom/public", onPublicMessageReceiver)
        userJoin();
    }
    const onError = (err) => {
        console.log(err);
    }

    const onPublicMessageReceiver = (payload) => {
        let payloadData = JSON.parse(payload.body)
        console.log(payloadData);
        switch (payloadData.status) {
            case "JOIN":
                break;
            case "MESSAGE":
                console.log(payloadData);
                publicChat.push(payloadData);
                setPublicChat([...publicChat])
                break;
            case "REBASE":
                publicChat.map(elem => {
                    if(elem.senderName === payloadData.senderName)
                        elem.senderName = payloadData.recipientName
                })
                setPublicChat([...publicChat])
                break;
        }
    }
    const rebase = (oldName, newName) => {
        if (stompClient) {
            let chatMessage = {
                senderName: oldName,
                recipientName: newName,
                status: "REBASE"
            };
            stompClient.send('/app/message', {}, JSON.stringify(chatMessage));
            setData({...data, "message": ""});
            console.log(chatMessage);
        }
    }


    const registerUser = () => {
        let Sock = new SockJS(path);
        stompClient = over(Sock);
        setName(data.username);
        stompClient.connect({}, onConnected, onError);
    }

    const sendPublicMessage = () => {
        if (stompClient) {
            let chatMessage = {
                senderName: data.username,
                message: data.message,
                status: "MESSAGE"
            };
            stompClient.send('/app/message', {}, JSON.stringify(chatMessage));
            setData({...data, "message": ""});
            console.log(publicChat);
        }
    }

    const userJoin = () => {
        let chatMessage = {
            senderName: data.username,
            status: "JOIN"
        };
        stompClient.send('/app/message', {}, JSON.stringify(chatMessage));
    }


    return (
        <div className="container">
            {data.connected ?
                <div className='chat-box__wrapper'>
                    <div className="chat-box">
                        <div className="member-list">
                            <div className='memberChangeName'>
                                <h1 className="output__name">{name}</h1>
                                <div className="changeName__wrapper">
                                    <input type="text" className='changeName' id='changeNameId'/>
                                    <button type="submit" className='changeBtn' onClick={() =>{
                                        let newValue = document.getElementById('changeNameId');
                                        if (publicChat.filter(elem => elem.senderName === newValue.value).length === 0) {
                                            rebase(name, newValue.value);
                                            publicChat.map(elem => {
                                                if (elem.senderName === name)
                                                    elem.senderName = newValue.value;
                                            })
                                            setPublicChat([...publicChat])
                                            setName(newValue.value);
                                            setData({...data, username: newValue.value});
                                            newValue.value = "";
                                        }else{
                                            window.alert("This name are already busy");
                                            newValue.value = "";
                                        }
                                    }}>Change</button>
                                </div>
                            </div>
                            <ul>
                                <li className="member">Chatroom</li>
                            </ul>
                        </div>
                        <div className="chat-content">
                            <ul className="chat-messages">
                                {publicChat.map((chat, index) => (
                                    <li key={index}>
                                        <div className='message__inner' key={index}>
                                            {chat.senderName !== data.username &&
                                                <div className='message'>
                                                    <div className="avatar">{chat.senderName}</div><div className="message-data">{chat.message}</div>
                                                </div>}
                                            {chat.senderName === data.username &&
                                                <div className='other-message'>
                                                    <div className="message-data">{chat.message}</div><div className="avatar self">{chat.senderName}</div>
                                                </div>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="send-message">
                                <input type="text" className="input-message" placeholder="Enter..." value={data.message}
                                       onChange={handleValue} name="message"/>
                                <button type="button" className="send-button" onClick={sendPublicMessage}>Send</button>
                            </div>
                        </div>
                    </div>
                </div>
                :
                <div className='reg__wrapper'>
                    <div className="register">
                        <input id="user-name" placeholder="Enter the username" value={data.username}
                               onChange={handleValue} name="username" className={'reg__input'}/>
                        <button type="button" onClick={registerUser} className={'reg__btn'}>Connect</button>
                    </div>
                </div>
            }
        </div>
    )
}
export default ChatRoom;