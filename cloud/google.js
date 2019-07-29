var firebase	= require('firebase-admin');
var google		= require('googleapis');
var oauth2		= google.auth.OAuth2;


var g = {
	clientId:		process.env.google_clientId,
	clientSecret:	process.env.google_clientSecret,
	redirectUrl:	process.env.url+'/google/auth'
}
var client = new oauth2(g.clientId, g.clientSecret, g.redirectUrl)

//note this is currently unsecure.  someone could override the state and update another user's credentials.
module.exports = {
	client: client,
	auth: function(request, response){
		if(request.body && request.body.userId){ //check for existing auth and return true or url
			var ref = firebase.database().ref('account/private').child(request.body.userId);
			ref.once('value', function(ds){
				var privateData = ds.val();
				if(privateData){
					if(privateData.auth){
						response.send({status: 'authenticated'})
					}else{
						var scopes = request.body.scopes || ['https://www.googleapis.com/auth/plus.me','https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/drive'];
						var url = client.generateAuthUrl({
							access_type:		'offline',
							approval_prompt:	'force',
							scope:				scopes,
							state:				request.body.userId
						})
						response.send({status: 'unauthenticated', authUrl: url})
					}
				}else{
					var scopes = request.body.scopes || ['https://www.googleapis.com/auth/plus.me','https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/drive'];
					var url = client.generateAuthUrl({
						access_type:		'offline',
						approval_prompt:	'force',
						scope:				scopes,
						state:				request.body.userId
					})
					response.send({status: 'not found', authUrl: url})
				}
			})
		}else if(request.query && request.query.code){ //store new token.
			client.getToken(request.query.code, function(e, tokens){
				var ref = firebase.database().ref('account/private').child(request.query.state).child('auth');
				ref.set({
					token: tokens.refresh_token
				}).then(function(r){
					response.send('Perfect!  You can close this window.')
				})
			})
		}else{
			response.send('unknown request')
		}
	},
	accessToken: function(userId){
		return new Promise(function (resolve, reject){
			console.log('FINDING TOKEN FOR: '+userId)
			var ref = firebase.database().ref('account/private').child(userId).child('auth/token');
			ref.once('value', function(ds){
				var token = ds.val();
				var auth = new oauth2(g.clientId, g.clientSecret, g.redirectUrl)
				auth.setCredentials({
					refresh_token: token
				})
				auth.refreshAccessToken(function(e, tokens){
					if(tokens)
						resolve(tokens.access_token)
					else
						reject({error:e, message:'no token found...'})
				})
			})
		})
	}
}