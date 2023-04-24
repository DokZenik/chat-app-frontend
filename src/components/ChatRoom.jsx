import {useEffect, useState} from "react";
import {over} from "stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

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
    const [chat, setChat] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [resName, setResName] = useState("public");
    const BASE = ["public"]

    const getUsers = () => {
        axios.get("http://localhost:8080/allUsers").then(res => {
            setAllUsers([...BASE, ...res.data])
            localStorage.setItem("public", JSON.stringify([]))
            res.data.map(elem => localStorage.setItem(elem, JSON.stringify([])))

        })
    }


    const rebaseChat = (index) => {
        console.log(JSON.parse(localStorage.getItem(index)))
        setChat(JSON.parse(localStorage.getItem(index)))
        setResName(index)
    }

    const handleValue = (event) => {
        const {value, name} = event.target;
        setData({...data, [name]: value})
    }


    const onConnected = () => {
        setData({...data, connected: true})
        stompClient.subscribe("/chatroom/public", onPublicMessageReceiver)
        stompClient.subscribe("/chatroom/" + data.username, onPublicMessageReceiver)
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
                getUsers()
                console.log("New user has joined")
                break;
            case "MESSAGE":
                console.log("payload" + payloadData.senderName);
                if(payloadData.recipientName !== "public") {
                    let buff = JSON.parse(localStorage.getItem(payloadData.senderName))
                    if (buff === null)
                        buff = []
                    console.log(buff)
                    buff.push(payloadData)
                    console.log(payloadData)
                    localStorage.setItem(payloadData.senderName, JSON.stringify(buff))
                    if(resName === payloadData.senderName)
                        setChat(JSON.parse(localStorage.getItem(payloadData.senderName)))
                }else{
                    let buff = JSON.parse(localStorage.getItem(payloadData.recipientName))
                    if (buff === null)
                        buff = []
                    console.log(buff)
                    buff.push(payloadData)
                    console.log(payloadData)
                    localStorage.setItem(payloadData.recipientName, JSON.stringify(buff))
                    if (resName === "public")
                        setChat(JSON.parse(localStorage.getItem(payloadData.recipientName)))
                }
                // chat.push(payloadData);
                // setChat([...chat])
                break;
            case "REBASE":
                chat.map(elem => {
                    if (elem.senderName === payloadData.senderName)
                        elem.senderName = payloadData.recipientName
                })
                setChat([...chat])
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
                status: "MESSAGE",
                recipientName: resName
            };
            if(resName !== "public") {
                // console.log(resName)
                const buff = JSON.parse(localStorage.getItem(resName))

                // console.log(buff)
                buff.push(chatMessage)

                localStorage.setItem(resName, JSON.stringify(buff))
                setChat(JSON.parse(localStorage.getItem(resName)))
            }
            stompClient.send('/app/message', {}, JSON.stringify(chatMessage));
            setData({...data, "message": ""});
            // console.log(chat);
        }
    }

    const userJoin = () => {
        let chatMessage = {
            senderName: data.username,
            recipientName: "public",
            status: "JOIN"
        };
        stompClient.send('/app/message', {}, JSON.stringify(chatMessage));
        getUsers()
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
                                    <button type="submit" className='changeBtn' onClick={() => {
                                        let newValue = document.getElementById('changeNameId');
                                        if (chat.filter(elem => elem.senderName === newValue.value).length === 0) {
                                            rebase(name, newValue.value);
                                            chat.map(elem => {
                                                if (elem.senderName === name)
                                                    elem.senderName = newValue.value;
                                            })
                                            setChat([...chat])
                                            setName(newValue.value);
                                            setData({...data, username: newValue.value});
                                            newValue.value = "";
                                        } else {
                                            window.alert("This name are already busy");
                                            newValue.value = "";
                                        }
                                    }}>Change
                                    </button>
                                </div>
                            </div>
                            <ul>
                                {
                                    allUsers.filter(elem => elem !== data.username).map(elem =>
                                        <li key={elem} onClick={() => rebaseChat(elem)} className="member">{elem}</li>)
                                }
                            </ul>
                        </div>
                        <div className="chat-content">
                            <div>Chat with:{resName}</div>
                            <ul className="chat-messages">
                                {chat.map((chat, index) => (
                                    <li key={index}>
                                        <div className='message__inner' key={index}>
                                            {chat.senderName !== data.username &&
                                                <div className='message'>
                                                    <div className="avatar">{chat.senderName}</div>
                                                    <div className="message-data">{chat.message}</div>
                                                </div>}
                                            {chat.senderName === data.username &&
                                                <div className='other-message'>
                                                    <div className="message-data">{chat.message}</div>
                                                    <div className="avatar self">{chat.senderName}</div>
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
            <button onClick={() => console.log(chat)}>SHOW</button>
        </div>
    )
}
export default ChatRoom;