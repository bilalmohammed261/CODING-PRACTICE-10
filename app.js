const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const app = express();
const path = require("path");
const dbPath = path.join(__dirname, "/covid19IndiaPortal.db");
const jwt = require('jsonwebtoken');
app.use(express.json());
//console.log(dbPath);

let dbObj = null;
const connectDbAndStartServer = async () => {
  try {
    dbObj = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is listening on http://localhost:3000/");
      //console.log(dBConnObj);
    });
  } catch (e) {
    console.log(`Error message :${e.message}`);
    process.exit(1);
  }
};
connectDbAndStartServer();

const camelToSnakeCase = (obj) => {
  return {
    
    
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population

  };
};

const camelToSnakeCase1 = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

//API 1
app.post("/login/",async(request,response)=>{
     const {username,password} = request.body;
        const selectUserQuery = `SELECT *FROM user
    WHERE username = '${username}';`;
    const dbResult = await dbObj.get(selectUserQuery);
     if(dbResult===undefined){
         response.status(400);
         response.send("Invalid user");
     }
     
     else{
         const isPasswordSame = await bcrypt.compare(password,dbResult.password);
         if(isPasswordSame){
             const payload = {
                 username : username
             };
         const jwtToken = jwt.sign(payload,"My_Token");  
         //console.log(jwtToken);
                 
         response.send({jwtToken});
         }
         else{
         response.status(400);
         response.send("Invalid password");
         }
     }

});

//Authenticate Token Middleware
const authenticateToken = (request,response,next) =>{
    let jwtToken;
    const authHeader = request.headers.authorization;
    //console.log(authHeader);
    //jwtToken = authHeader.split(" ")[1];
    //console.log(jwtToken);
    
    if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if(jwtToken===undefined){
         response.status(401);
    response.send("Invalid JWT Token");
  }
  else{
      jwt.verify(jwtToken,"My_Token",async(error,payload)=>{
        if(error){
        response.status(401);
        response.send("Invalid JWT Token"); 
        }
        else{
            next();
        }
      });
  }

}

//API 2
app.get("/states/",authenticateToken,async(request,response)=>{
      const stateQuery = `SELECT * FROM state;`;
  const stateList = await dbObj.all(stateQuery);
  response.send(stateList.map((obj) => camelToSnakeCase(obj)));
});

//API 3
app.get("/states/:stateId/",authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getQuery = `SELECT * FROM state
   WHERE state_id = ${stateId};`;
  const state = await dbObj.get(getQuery);
  response.send(camelToSnakeCase(state));
});

//API 4
app.post("/districts/",authenticateToken, async (request, response) => {
  //console.log(request.body);

  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  //console.log(cases);

  const addDistrictQuery = `INSERT INTO district (district_name,state_id,
    cases,cured,active,deaths)
   VALUES('${districtName}',${stateId},${cases},
   ${cured},${active},${deaths});`;
  //console.log(addDistrictQuery);

  await dbObj.run(addDistrictQuery);
  response.send("District Successfully Added");
});

//API 5
app.get("/districts/:districtId/",authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `SELECT * FROM district
   WHERE district_id = ${districtId};`;
  const district = await dbObj.get(getDistrictQuery);
  response.send(camelToSnakeCase1(district));
});

//API 6
app.delete("/districts/:districtId/",authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const removeDistrictQuery = `DELETE  FROM district
   WHERE district_id = ${districtId};`;
  await dbObj.run(removeDistrictQuery);
  response.send("District Removed");
});

//API 7

app.put("/districts/:districtId/",authenticateToken, async (request, response) => {
  //console.log(request.body);
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  //console.log(cases);

  const updateDistrictQuery = `UPDATE  district 
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured =  ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_Id = ${districtId}    
 ;`;
  // console.log(addDistrictQuery);

  await dbObj.run(updateDistrictQuery);
  response.send("District Details Updated");
});

//API 8
app.get("/states/:stateId/stats/",authenticateToken, async (request, response) => {
  // console.log(request.params);
  const { stateId } = request.params;
  const getStatsQuery = `SELECT SUM(cases) AS  totalCases,
   SUM(cured) AS  totalCured,SUM(active) AS  totalActive
   ,SUM(deaths) AS  totalDeaths FROM district
   WHERE state_id=${stateId}
   ;`;
  const statsResult = await dbObj.get(getStatsQuery);
  response.send({
    totalCases: statsResult.totalCases,
    totalCured: statsResult.totalCured,
    totalActive: statsResult.totalActive,
    totalDeaths: statsResult.totalDeaths,
  });
});



module.exports = app;