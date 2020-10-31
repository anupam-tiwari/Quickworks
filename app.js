const express = require('express');
const {google} = require('googleapis');
const fs = require('fs');
const Base64=require("js-base64");
const https = require('https');
// Initalizing th OAuth2Client we provide secret ID , key and callback url
const oauth2Client = new google.auth.OAuth2(
    "236180773893-46jkuqncvgavf3ubsd38raah1pqgdi3f.apps.googleusercontent.com",
    "bKZUIJB9LPMU74_FfzQlj51U",
    "http://localhost:3000/auth/google/confirm"
);
const scope = ["https://www.googleapis.com/auth/userinfo.email"];

const app = express();

// This function encodes the mail in base 64 and returns it.
const sendEmail = (auth, mail)=>{
      const gmail=google.gmail({version:'v1', auth});
        let encodeMessage = Base64.encodeURI(mail);
        let email= gmail.users.messages.send({
            userId:'me',
            resource:{
                raw: encodeMessage
            }
         })
         return email;
}

//This function constructs the mail.
const mailBuild = (from,to,subject,body)=>{
    let mailParts=[
        `From:${from}`,
        `To:${to}`,
        `Subject:${subject}`,
        `\n${body}`
    ];
    let mail = mailParts.join('\n');
    return mail;
        }


//The user has to make a request to /credentials from here the user will be redirected to the consent page.
app.get('/credentials', (req, res)=>{
    let url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
      
        // If you only need one scope you can pass it as a string
        scope: scope
      });

		res.redirect(url);
	
	
});

// After success we get access to the tokens. 
app.get('/auth/google/confirm', (req, res)=>{
    const {code} = req.query;
    oauth2Client.getToken(code, function (err, tokens) {		
        //console.log( tokens );
        // Now to get the access to the users email id we need to make a  request to the following url.
        let userUrl = "https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + tokens.access_token
        // After making request we extract the email id and store it in a file
        https.get(userUrl, (resp)=>{
            let data = "";
            resp.on('data', (chunk)=>{
                data = JSON.parse(chunk);
                //console.log(data);
                // We overwrite the contents of the file with users email address.
                fs.writeFileSync('./Email.txt',data.email,{encoding:'utf8',flag:'w'});
            });
        });
        //console.log(userUrl);
        if(!err){
            oauth2Client.setCredentials(tokens);
            return res.json({message: 'Email written to the file. Please post data to `/sendemail`'});
        }
        else{
            return res.json({Error: "err"})
        }
    })
   
});

// The API expects the front end to send the subject and the mail body using a POST request.
app.post('/sendemail', (req, res)=>{
    
    if(oauth2Client !== null){
        // We read the stored email address from the file and send the mail.
    fs.readFile('./Email.txt', 'utf8', function(err, content){ 
        let mail = mailBuild("namanb487@gmail.com",content,req.body.subject,req.body.mailBody);
        let email = sendEmail(oauth2Client,mail);
        res.json({mail: email});
           
         });
        }
        // if oauth2Client is not initialized we redirect back to the credentials route.
    else{
        res.redirect('/credentials')
    }
    }); 


app.listen(3000, ()=>{
    console.log("Server started at port 3000");
});
