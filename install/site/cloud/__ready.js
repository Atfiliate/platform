// __ready: a startup function. Cloud handlers named '__<name>' in dev/site run once when the
// server boots and are never served over HTTP (they return 404). Put timers, queues and
// listeners here. init() gets no request or response.
js={
	init: ()=>{
		console.log('STARTUP site ready' + (process.env.DYNO ? ' on ' + process.env.DYNO : ''));
	}
}
