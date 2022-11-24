



import { AnyArray, AnyObject } from "immer/dist/internal"
export const generateRoverResource=(name:string,type:string,config:AnyObject,logic:boolean)=>{

  let resource:AnyObject={}
  resource["name"]=name
  resource["type"]=type
  
  resource["logic"]=logic
  if (config.length!==0||config!==undefined) {
    resource["config"]=config
    if (config.hasOwnProperty("logicpath")) resource["logicpath"]=config["logicpath"]
    if (config.hasOwnProperty("package")) resource["package"]=config["package"]
  }
  return resource

}

export const generatecrud= (apiname:string,config:AnyObject)=>{
 
  let objects:AnyArray=[]
  let functions:AnyArray=[]
  let tables:AnyArray=[]
  let iamresources:AnyArray=[]
  
  Object.keys(config).forEach(ele=>{
    let obj:AnyObject=JSON.parse(JSON.stringify(config[ele]))
    obj["name"]=ele
    obj["role"]=apiname+"Roles"
    obj["resource"]=ele+"Function"
    objects.push(obj)
    let tableaccess={
        
      "Environment": {
          "Variables": {
            "Table": { "Ref" : ele+"Table"}
          }
      },
      "Policies": [
        "AWSLambdaDynamoDBExecutionRole",
        {
          "DynamoDBCrudPolicy": {
            "TableName": { "Ref" : ele+"Table"},
            
          }
        }
      ]
    }
    let lambdafunc:AnyObject=generateRoverResource(ele+"Function","lambda",tableaccess,true)
    lambdafunc["logicpath"]="crud";
    let tableconfig={
      "BillingMode": "PAY_PER_REQUEST",
      "AttributeDefinitions": [
        {
          "AttributeName": "id",
          "AttributeType": "S"
        }
      ],
      "KeySchema": [
        {
          "AttributeName": "id",
          "KeyType": "HASH"
        }
      ]
    }
   
    let table=generateRoverResource(ele+"Table","dynamoDB",tableconfig,false)
    functions.push(lambdafunc)
    tables.push(table)
    iamresources.push({ "Fn::Sub":"arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/"+table["name"]},
    { "Fn::Sub":"arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/"+table["name"]+"/index/*"})
    
}) 
let role:AnyObject={
  "name":apiname+"Roles",
  "type":"iamrole",
  "config":{
   "iamservice":["lambda.amazonaws.com","apigateway.amazonaws.com"],
   "managedarn":["AWSLambdaBasicExecutionRole","AmazonAPIGatewayPushToCloudWatchLogs"],
   "Path": "/",
   "Policies":[
       {  "name":"lambdainvoke",
           "Action": "lambda:InvokeFunction",
           "Resource": { "Fn::Sub":"arn:aws:lambda:*:${AWS::AccountId}:function:*"}
       },
       {  "name":"dynamodbcrud",
           "Action":  [
            "dynamodb:GetItem",
            "dynamodb:DeleteItem",
            "dynamodb:PutItem",
            "dynamodb:Scan",
            "dynamodb:Query",
            "dynamodb:UpdateItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:BatchGetItem",
            "dynamodb:DescribeTable",
            "dynamodb:ConditionCheckItem"
        ],
           "Resource":iamresources
       }
   ]
      
  },
  "logic":false
  }
let apis:AnyObject={
"name":apiname+"APIs",
"type":"apigateway",
"config":{
  "StageName":"dev",
  "objects":objects
  },
"logic":false
}
let res:AnyObject={}
res[apiname]={"resources":[]}
let resarray=res[apiname]["resources"]
resarray.push(role)
resarray.push(apis)
resarray=resarray.concat(functions);
resarray=resarray.concat(tables);
res[apiname]["resources"]=resarray

  return res
}
export const generateLambdaEnv=(input:AnyObject)=>{
  let response:AnyObject={}
  response["Variables"]={}
  Object.keys(input).forEach(ele=>{
    let refval:AnyObject={}
    refval["Ref"]=input[ele]
    response["Variables"][ele]=refval

  })
  return response
}
export const generateAPIGatewayObject=(input:AnyArray) =>{
  let response:AnyArray=[]
  input.forEach(ele=>{
    let obj:AnyObject={}
    obj["name"]         = ele[0]
    obj["methods"]      = ele[1]
    obj["resource"]     = ele[2]
    obj["role"]         = ele[3]
    obj["path"]         = ele[4]
    obj["resourcetype"] = ele[5]
    response.push(obj)
  })
  return response
}
let crudcomponentconfig={
  book: {
    path: '/book',
    methods: [ 'put', 'get', 'post', 'delete', 'options' ],
    resourcetype: 'lambda'
  }
}
let crudcomponent:AnyObject=generatecrud("Book",crudcomponentconfig)

export let Components:AnyObject={
    "S3 Lambda":[
      {
        "name":"Lambdas",
        "type":"lambda",
        "config":{
            "Policies": [
              "AWSLambdaDynamoDBExecutionRole"
            ]
          },
        "logic":true
    },
    {
      "name":"Bucket",
      "type":"s3bucket",
      "config":{
        "CorsConfiguration": {
          "CorsRules": [
              {
                  "AllowedHeaders": [
                      "*"
                  ],
                  "AllowedMethods": [
                      "GET",
                      "PUT",
                      "POST",
                      "DELETE"
                  ],
                  "AllowedOrigins": [
                      "*"
                  ]
              }
          ]
      }
      },
      
    }
    ],
  "CRUD API": crudcomponent["Book"]["resources"],
  "S3 Bucket": [generateRoverResource("Bucket", "s3bucket", {},false)],
  "Lambda": [generateRoverResource("Lambda", "lambda", {},true)],
  "DynamoDB": [generateRoverResource("Dynamodb", "dynamoDB", {},false)]
   
}
export let ModuleDescription={
  "S3 Lambda":"lambda with S3 as trigger",
  "CRUD API": "basic book CRUD API's ",
  "S3 Bucket": "Simple Storage Service Bucket ",
  "Lambda": "one Lambda function",
  "DynamoDB": "One DynamoDB table"

 
}