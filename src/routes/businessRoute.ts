import { PrismaClient } from '@prisma/client';
import express ,{Request,Response} from 'express';
import cors from'cors';
const businessRouter=express.Router();
const prisma= new PrismaClient();

businessRouter.use(cors());

businessRouter.get('/', async (req:Request,res:Response)=>{
  const business= await prisma.business.findMany();
  res.json(business);
});

businessRouter.get('/:id', async(req:Request,res:Response)=>{
  const {id}=req.params;
  const business=await prisma.business.findUnique({where:{id}});
  if(!business){
     res.status(404).json({error:"Business not found"});
  }
  res.json(business);
});


businessRouter.post('/', async(req:Request,res:Response)=>{
  const{name,subscription}=req.body;
  const business=await prisma.business.create({
    data:{
      name,
      subscription,
    },
  });
  res.status(201).json("successfully created business");
  res.json(business);
})


//PUT update business
businessRouter.put('/:id', async(req:Request,res:Response)=>{
  const{id}=req.params;
  const{name,subscription}= req.body;
  const business=await prisma.business.update({
    where:{id},
    data:{
      name,subscription
    }
  });
  res.status(201).json("Business updated successfully");
  res.json(business);
});

businessRouter.delete('/:id',async(req:Request,res:Response)=>{
  const {id}= req.params;
  await prisma.business.delete({
    where:{id}
  });
  res.status(204).send();
});

export default businessRouter;