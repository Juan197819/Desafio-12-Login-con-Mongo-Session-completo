import express from 'express';
import exphbs from 'express-handlebars';
import {Server as HttpServer} from "http";
import {Server as IOServer} from "socket.io";
import lista from './prodAleatorios.js'
import {daoMensaje } from './src/index.js';
import normalizado from './normalizado.js'
import session from 'express-session';
import MongoStore from 'connect-mongo';


const app= express();
const httpServer = new HttpServer(app)
const io = new IOServer(httpServer)

app.engine('handlebars',exphbs.engine())
app.use(express.static('views'))

app.set('view engine','handlebars')
app.set('views', './views')

app.use(express.json())
app.use(express.urlencoded({extended: true})) 
app.use(session({
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://Juan1978:Juan1978@cluster0.gwdrp.mongodb.net/?retryWrites=true&w=majority',
    ttl:60,
    mongoOptions:{
      useNewUrlParser:true,
      useUnifiedTopology:true
    }
  }),
  
  secret: 'secreto', 
  resave:false,
  saveUninitialized:false,
}))
//-----------------------GET-----------------------

function auth(req,res,next) {
  if (req.session.usuario) {
    next()
  } else {
    res.redirect('/login')
  }
}

app.get('/', auth, (req, res) => {
  res.redirect('/centroMensajes')
})

app.get('/login',(req, res) => {
  res.render("login");
})

app.get('/logout',auth, (req, res) => {
  req.session.destroy((err)=>{
    if (!err) {
      setTimeout(()=>{
       return res.redirect('login')
      },2000)
    } else {
        res.send('ERROR EN LOGOUT', err )
    }
    console.log('Te deslogueaste con exito')})
})

app.post('/', (req, res) => {
  const usuario= req.body
  req.session.usuario= usuario
  res.redirect('/centroMensajes')
})
let contador = 0
app.get('/centroMensajes',auth, (req, res) => {
  const user=req.session.usuario
  const nombre = user.userName.toUpperCase()
  res.render("formulario", {nombre});
})

app.get('/api/productos-test',(req, res) => {
    
  let tablaProductos=lista()
  res.render("tablaAleatoria", {tablaProductos});
})

//------------------WEBSOCKETS------------------------------

let mensajes1=[]
let mensajesNormalizados;

io.on("connection", (socket) => { 
  console.log("Usuario Conectado");

  if (!mensajes1.length) {
    mensajesNormalizados=[]
  } else {
    mensajesNormalizados= normalizado(mensajes1)
  }
  socket.emit("mensajes",mensajesNormalizados);
  
  socket.on("mensajeNuevo", (newMessage) => {
    mensajes1.push(newMessage);
    mensajesNormalizados= normalizado(mensajes1)

    daoMensaje.guardar(newMessage)
    io.sockets.emit("mensajes", mensajesNormalizados);
  });
});

//---------------SERVER LISTEN------------------------------

const PORT=process.env.PORT || 8080; 

const connectedServer = httpServer.listen(PORT, () => {
  console.log(`Servidor con Websockets en el puerto ${connectedServer.address().port}`);
});

connectedServer.on("error", (error) =>
  console.log(`El error fue el siguiente ${error}`)
);
