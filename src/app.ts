import  express  from "express";
import cors from "cors";
import authRouter from "./routes/authRoute";
import clientRouter from "./routes/clientRoute";
import businessRouter from "./routes/businessRoute";
import UserRouter from "./routes/userRoute";
import FollowUpRouter from "./routes/followUpRoute";
import LeadRouter from "./routes/leadRoute";

const app = express();
app.use(cors());
app.use(express.json());

app.use("api/v1/auth",authRouter);
app.use('/api/clients',clientRouter);
app.use('/api/v1/business',businessRouter);
app.use('/api/v1/user',UserRouter);
app.use('/api/v1/followUp',FollowUpRouter);
app.use('/api/v1/leads',LeadRouter);


async function main() {

  try{



  } catch(error){

  }
  
}

main();
