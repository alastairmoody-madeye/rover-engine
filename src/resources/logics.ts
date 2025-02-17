export const LambdaLogics: Record<string, Record<string, string>> = {
  "nodejs14.x": {
    EmailAuthModule_PreSignUp: `exports.lambdaHandler = async event => {
                event.response.autoConfirmUser = false;
                event.response.autoVerifyEmail = false;
                return event;
            };`,
    EmailAuthModule_DefineAuthChallenge: `exports.lambdaHandler = async event => {
                if (event.request.session &&
                    event.request.session.length >= 3 &&
                    event.request.session.slice(-1)[0].challengeResult === false) {
                    // The user provided a wrong answer 3 times; fail auth
                    event.response.issueTokens = false;
                    event.response.failAuthentication = true;
                } else if (event.request.session &&
                    event.request.session.length &&
                    event.request.session.slice(-1)[0].challengeResult === true) {
                    // The user provided the right answer; succeed auth
                    event.response.issueTokens = true;
                    event.response.failAuthentication = false;
                } else {
                    // The user did not provide a correct answer yet; present challenge
                    event.response.issueTokens = false;
                    event.response.failAuthentication = false;
                    event.response.challengeName = 'CUSTOM_CHALLENGE';
                }
            
                return event;
            };
            `,
    EmailAuthModule_CreateAuthChallenge: `
                exports.lambdaHandler = async event => {
                const connectionString = process.env.DB_CONNECTION_STRING
                let password;
                if(!event.request.session || !event.request.session.length) {
                    // new session, so fetch password from the db
                    const username = event.request.userAttributes.email;
                    const user =event.request.userAttributes.username;
                    const password = event.request.userAttributes.password;
                } else {
                    const previousChallenge = event.request.session.slice(-1)[0];
                    password = previousChallenge.challengeMetadata.match(/PASSWORD-(d*)/)[1];
                }
                // This is sent back to the client app
                event.response.publicChallengeParameters = { username: event.request.userAttributes.email };
            
                // Add the secret login code to the private challenge parameters
                // so it can be verified by the "Verify Auth Challenge Response" trigger
                event.response.privateChallengeParameters = { password };
            
                // Add the secret login code to the session so it is available
                // in a next invocation of the "Create Auth Challenge" trigger
                event.response.challengeMetadata = \`PASSWORD-\${password}\`;    
                return event;
            
            }`,
    EmailAuthModule_VerifyAuthChallengeResponse: `const md5 = require('md5');
            exports.lambdaHandler = async event => {
                const expectedAnswer = event.request.privateChallengeParameters.password; 
                if (md5(event.request.challengeAnswer) === expectedAnswer) {
                    event.response.answerCorrect = true;
                } else {
                    event.response.answerCorrect = false;
                }
                return event;
            };`,
    EmailAuthModule_SignUpFunctions: `
            let response;
                const aws = require('aws-sdk');
                const UserPoolID = process.env.UserPoolID
                const UserPoolClientID = process.env.UserPoolClientID
                exports.lambdaHandler = async (event, context) => {
                    try {
                        if(event.body!==undefined){
                            event=JSON.parse(event.body)
                        }
                        // const ret = await axios(url);
                        const cognito = new aws.CognitoIdentityServiceProvider();
                        const params = {
                            ClientId: UserPoolClientID,
                            Username:event.emailId,
                            Password: event.Password,
                            UserAttributes:[
                            {
                    Name: 'email',
                    Value: event.emailId,
                    },
                    {
                    Name: "name",
                    Value: event.name
                    }]
                        };
                        console.log(params)
                        let res=await cognito.signUp(params).promise();
                        response = {
                            'statusCode': 200,
                            'body': JSON.stringify(res)
                        }
                    } catch (err) {
                        console.log(err);
                        response = {
                        'statusCode': 200,
                    'body': JSON.stringify(err)
                        }
                    }

                    return response
                };`,
    EmailAuthModule_ResendCode: `
            let response;
            const aws = require('aws-sdk');
            const UserPoolID = process.env.UserPoolID
            const UserPoolClientID = process.env.UserPoolClientID
            exports.lambdaHandler = async (event, context) => {
                try {
                    if(event.body!==undefined){
                        event=JSON.parse(event.body)
                    }
                    const cognito = new aws.CognitoIdentityServiceProvider();
                    
                    letparams = {
                                    ClientId: UserPoolClientID,
                                    Username: event.emailId
              }
              let res=await cognito.resendConfirmationCode(params).promise();
              
              
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            message: res,
                           
                        })
                    }
                } catch (err) {
                    console.log(err);
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify(err)
                        }
                }
            
                return response
            };
            `,
    EmailAuthModule_ConfirmUser: `
            let response;
            const aws = require('aws-sdk');
            const dynamoDB = new aws.DynamoDB.DocumentClient();
            const UserTable = process.env.userinfoTable
            const UserPoolID = process.env.UserPoolID
            const UserPoolClientID = process.env.UserPoolClientID
            async function addUserData(userData) {
                try {
                        console.log("[INFO] addUserData input",userData)
                        const params = {
                                        TableName: UserTable,
                                        Item: userData
            
                        };
                        letItems  = await dynamoDB.put(params).promise();
                        console.log("[INFO] addUserData output",Items)
                        return Items
            
                } 
                catch (err) {
                        throw err;
                }
            }
            exports.lambdaHandler = async (event, context) => {
                try {
                    if(event.body!==undefined){
                        event=JSON.parse(event.body)
                    }
                    const cognito = new aws.CognitoIdentityServiceProvider();
                    letparams = {
                                    ClientId: UserPoolClientID,
                                    ConfirmationCode: event.Code,
                                    Username: event.emailId
              }
                   let res=await cognito.confirmSignUp(params).promise();
                    
                    letparams1 = {
                                    UserPoolId: UserPoolID,
                                   AttributesToGet: ["email","name","sub"],
                                   
              }
              
                    
                    res=await cognito.listUsers(params1).promise();
                    let user={}
                    let Attributes={}
                    res["Users"].map(ele=>{
                        
                        Attributes = ele["Attributes"].find(ele=>ele.Name==="email"&&ele.Value==event.emailId)
                        if (Attributes!==undefined) {
                            ele["Attributes"].map(ele=>{
                                user[ele.Name]=ele.Value
                            })
                        }
                        
            
                    })
                    console.log(user)
                    await addUserData(user)
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            message: res,
                           
                        })
                    }
                // await addUserData()
                } catch (err) {
                    console.log(err);
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify(err)
                        }
                }
            
                return response
            };
            `,
    EmailAuthModule_ConfirmForgotPassword: `
            let response;
            const UserPoolID = process.env.UserPoolID
            const UserPoolClientID = process.env.UserPoolClientID
            const aws = require('aws-sdk');
            exports.lambdaHandler = async (event, context) => {
                try {
                    if(event.body!==undefined){
                        event=JSON.parse(event.body)
                    }
                    const cognito = new aws.CognitoIdentityServiceProvider();
                    letparams = {
                                    ClientId: UserPoolClientID,
                                    ConfirmationCode: event.Code,
                                    Username: event.emailId,
                                    Password:  event.password, /* required */
              }
              let res=await cognito.confirmForgotPassword(params).promise();
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            message: res,
                           
                        })
                    }
                } catch (err) {
                    console.log(err);
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify(err)
                        }
                }
            
                return response
            };
            `,
    EmailAuthModule_ForgotPassword: `
            let response;
            const UserPoolID = process.env.UserPoolID
            const UserPoolClientID = process.env.UserPoolClientID
            const aws = require('aws-sdk');
            exports.lambdaHandler = async (event, context) => {
                try {
                    if(event.body!==undefined){
                        event=JSON.parse(event.body)
                    }
                    const cognito = new aws.CognitoIdentityServiceProvider();
                    letparams = {
                                    ClientId: UserPoolClientID,
                                    Username: event.emailId
                                }
              let res=await cognito.forgotPassword(params).promise();
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            message: res,
                           
                        })
                    }
                } catch (err) {
                    console.log(err);
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify(err)
                        }
                }
            
                return response
            };
            `,
    EmailAuthModule_AuthorizerFunction: `
            import jwt from 'jsonwebtoken';

            // By default, API Gateway authorizations are cached (TTL) for 300 seconds.
            // This policy will authorize all requests to the same API Gateway instance where the
            // request is coming from, thus being efficient and optimising costs.
            const generatePolicy = (principalId, methodArn) => {
              const apiGatewayWildcard = methodArn.split('/', 2).join('/') + '/*';
            
              return {
                principalId,
                policyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Action: 'execute-api:Invoke',
                      Effect: 'Allow',
                      Resource: apiGatewayWildcard,
                    },
                  ],
                },
              };
            };
            
            export async function handler(event, context) {
              if (!event.authorizationToken) {
                throw 'Unauthorized';
              }
            
              const token = event.authorizationToken.replace('Bearer ', '');
            
              try {
                const claims = jwt.verify(token, process.env.AUTH0_PUBLIC_KEY);
                const policy = generatePolicy(claims.sub, event.methodArn);
            
                return {
                  ...policy,
                  context: claims
                };
              } catch (error) {
                console.log(error);
                throw 'Unauthorized';
              }
            };`,
    s3_lambda: `exports.lambdaHandler = async event => {
                if (event.request.session &&
                    event.request.session.length >= 3 &&
                    event.request.session.slice(-1)[0].challengeResult === false) {
                    // The user provided a wrong answer 3 times; fail auth
                    event.response.issueTokens = false;
                    event.response.failAuthentication = true;
                } else if (event.request.session &&
                    event.request.session.length &&
                    event.request.session.slice(-1)[0].challengeResult === true) {
                    // The user provided the right answer; succeed auth
                    event.response.issueTokens = true;
                    event.response.failAuthentication = false;
                } else {
                    // The user did not provide a correct answer yet; present challenge
                    event.response.issueTokens = false;
                    event.response.failAuthentication = false;
                    event.response.challengeName = 'CUSTOM_CHALLENGE';
                }
            
                return event;
            };
            `,
    EmailAuthModule_Users: `
            
            let response;
            const aws = require('aws-sdk');
            const dynamoDB = new aws.DynamoDB.DocumentClient();
            const UserTable = process.env.userinfoTable
            const UserPoolID = process.env.UserPoolID
            const UserPoolClientID = process.env.UserPoolClientID
            async function getUserData(id) {
                try {
                    const params = {
                    TableName: UserTable,
                    Key: { email: id },
                    };
                    let{ Item } = await dynamoDB.get(params).promise();
                    console.log("[INFO] getUserData output",Item)
                    return Item;
                } 
                catch (err) {
                        throw err;
                }
            }
            async function deleteUserData(id) {
                try {
                    const params = {
                    TableName: UserTable,
                    Key: { email: id },
                    };
                    let{ Item } = await dynamoDB.delete(params).promise();
                    console.log("[INFO] getUserData output",Item)
                    return Item;
                } 
                catch (err) {
                        throw err;
                }
            }
            async function addUserData(userData) {
                try {
                        console.log("[INFO] addUserData input",userData)
                        const params = {
                                        TableName: UserTable,
                                        Item: userData
                        };
                        letItems  = await dynamoDB.put(params).promise();
                        console.log("[INFO] addUserData output",Items)
                        return Items
                } 
                catch (err) {
                        throw err;
                }
            }
            exports.lambdaHandler = async (event, context) => {
                try {
                    let res
                    console.log("events ",event.pathParameters["email"])
                    if (event.httpMethod=="GET"){
                    res =await getUserData(event.pathParameters["email"])
                    
                    }
                    if (event.httpMethod=="PUT"){
                        if(event.body!==undefined){
                        event=JSON.parse(event.body)
                        }
                        res =await addUserData(event)
                        res={"message":"data updated"}
                    }
                    if (event.httpMethod=="DELETE"){
                    res =await deleteUserData(event.pathParameters["email"])
                    res={"message":"data deleted"}
                    
                    }
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            data: res,
                           
                        })
                    }
                } catch (err) {
                    console.log(err);
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify(err)
                        }
                }
            
                return response
            };
            
            `,
    crud: `let response;
            const aws = require('aws-sdk');
            const dynamoDB = new aws.DynamoDB.DocumentClient();
            const Table = process.env.Table
            async function getData(id) {
                try {
                    const params = {
                    TableName: Table,
                    Key: { id: id },
                    };
                    let{ Item } = await dynamoDB.get(params).promise();
                    console.log("[INFO] getData output",Item)
                    return Item;
                } 
                catch (err) {
                        throw err;
                }
            }
            async function deleteData(id) {
                try {
                    const params = {
                    TableName: Table,
                    Key: { id: id },
                    };
                    let{ Item } = await dynamoDB.delete(params).promise();
                    console.log("[INFO] getData output",Item)
                    return Item;
                } 
                catch (err) {
                        throw err;
                }
            }
            async function addupdateData(userData) {
                try {
                        console.log("[INFO] addupdateData input",userData)
                        const params = {
                                        TableName: Table,
                                        Item: userData
                        };
                        letItems  = await dynamoDB.put(params).promise();
                        console.log("[INFO] addupdateData output",Items)
                        return Items
                } 
                catch (err) {
                        throw err;
                }
            }
            exports.lambdaHandler = async (event, context) => {
                try {
                    let res
                    console.log("events ")
                    if (event.httpMethod=="POST"){
                        if(event.body!==undefined){
                        event=JSON.parse(event.body)
                        }
                        res =await addupdateData(event)
                        res={"message":"data updated"}
                    }
                    if (event.httpMethod=="GET"){
                    res =await getData(event.pathParameters["id"])
                    
                    }
                    if (event.httpMethod=="PUT"){
                        if(event.body!==undefined){
                        event=JSON.parse(event.body)
                        }
                        res =await addupdateData(event)
                        res={"message":"data updated"}
                    }
                    if (event.httpMethod=="DELETE"){
                    res =await deleteData(event.pathParameters["id"])
                    res={"message":"data deleted"}
                    
                    }
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            data: res,
                           
                        })
                    }
                } catch (err) {
                    console.log(err);
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify(err)
                        }
                }
            
                return response
            };`,
    rdstable: `const secret=process.env.Secret
    const clustername=process.env.Clustername
    const region=process.env.Region
    const accountid=process.env.Accountid
    const DBname= process.env.DBname
    const data = require('data-api-client')({
      secretArn: secret,
      resourceArn:  "arn:aws:rds:"+region+":"+accountid+":cluster:"+clustername,
      database: DBname // default database
    })
    async function createTable(TableName) {
      console.log(\`CREATE TABLE IF NOT EXISTS \`+TableName+\` (
        name VARCHAR(100) NOT NULL,
        id VARCHAR(50) NOT NULL,
        PRIMARY KEY (id)
      )\`)
      let response=await data.query(
        \`CREATE TABLE IF NOT EXISTS \`+TableName+\`(
        name VARCHAR(100) NOT NULL,
        id VARCHAR(50) NOT NULL,
        PRIMARY KEY (id)
      )\`)
      return response
    }
    async function insertData(values,params,TableName) {
      console.log(\`INSERT INTO \`+ TableName+params+\` VALUES(:name,:id) \`,values)
      let response=await data.query(
        \`INSERT INTO \`+ TableName+params+\` VALUES(:name,:id) \`,
        values)
    
      return response
    }
    async function getData(TableName) {
      let response=await data.query(
        \`SELECT * FROM \`+ TableName)
    
      return response
    }
    async function updateData(id,name,TableName) {
      let response=await data.query(
        \`UPDATE \`+ TableName +\` SET name = :name WHERE id = :id \`,
      { name: name, id: id })
      return response
    }
    async function getDatabyID(id,TableName) {
      let response=await data.query(
        \`SELECT * FROM \`+ TableName +\` WHERE id = :id \`,
        { id: id })
      return response
    }
    async function deleteDatabyID(id,TableName) {
      let response=await data.query(
        \`DELETE FROM \`+TableName+\` WHERE id = :id \`,
      { id: id } )
      return response
    }
    exports.lambdaHandler = async (event) => {
    
      let TableName="userk"
      let tablecreate=await createTable(TableName)
      console.log("table creation",tablecreate)
      let insertdata= await insertData({"name":"dgb","id":"32"},'(name,id)',TableName)
      console.log("insertData",insertdata)
      let getdata = await getData(TableName)
      console.log("getdata",getdata)
      let updatedata = await updateData("32","DGB",TableName)
      console.log("updateData",updatedata)
      let getdatabyid = await getDatabyID("32",TableName)
      console.log("getDatabyID",getdatabyid)
      let deletedatabyid = await deleteDatabyID("32",TableName)
      console.log("deleteDatabyID",deletedatabyid)  
    };`,
  },
  "python3.9": {},
};
