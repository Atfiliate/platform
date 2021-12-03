js={
	init: function(request, response){
		var gid = request.body.gid;
		var pid = request.body.pid;
		var cid = request.body.cid;
		console.log({gid,pid,cid})
		
		function send(code){
			response.setHeader("Content-Type", 'text/plain')
			response.send(code)
		}

		
		var dpath = `acl/db/groups/${gid}/addon_code/${pid}/components`;
		var path = `${dpath}/${cid}`;
		db.doc(path).get().then(r=>{
			var component = r.data();
			send(component);
		})
	}
}