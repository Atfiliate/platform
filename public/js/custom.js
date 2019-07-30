Array.prototype.flat = function(col, placeholder){
	return this.map(function(i){
		return i[col] === undefined ? placeholder : i[col];
	})
}
Array.prototype.getUnique = function() {
	var u = {undefined:1},
		a = [];
	for (var i = 0, l = this.length; i < l; ++i) {
		if (u.hasOwnProperty(this[i]))
			continue;
		a.push(this[i]);
		u[this[i]] = 1;
	}
	return a;
}
Array.prototype.unique = function(col){
	if(col)
		return this.flat(col).getUnique();
	else
		return this.getUnique();
}

Array.prototype.shuffle = function() {
	var i = this.length,
		j, temp;
	if (i == 0) return this;
	while (--i) {
		j = Math.floor(Math.random() * (i + 1));
		temp = this[i];
		this[i] = this[j];
		this[j] = temp;
	}
	return this;
}
Array.prototype.max = function() {
	return Math.max.apply(null, this);
};

Array.prototype.min = function() {
	return Math.min.apply(null, this);
};
Array.prototype.allKeys = function(){
	return Object.keys(this.reduce((a,b)=>{
		return {...a, ...b}
	}, {}))
}

String.prototype.toCamelCase = function() {
	var str = this.replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
		.replace(/\s/g, '')
		.replace(/^(.)/, function($1) { return $1.toLowerCase(); })
	return str.replace(/\W/g, '')
}
String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};



let jsonToTable = (obj, path)=>{
	let html = ``;
	if(typeof obj == 'object'){
		if(obj.length){ // is array
			if(typeof obj[0] == 'object'){ //array of objects
				let keys = obj.allKeys();
				let rows = `<tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>`;
				rows += obj.map((row, i)=>{
					return `<tr>${keys.map(k=>`<td data-path="${path}[${i}].${k}">${row[k]}</td>`).join('')}</tr>`;
				}).join('')
				html = `<table>${rows}</table>`;
			}else{ // regular array
				let rows = ``;
				obj.forEach((row, i)=>{
					rows += `<tr><td data-path="${path}[${i}]">${jsonToTable(row, `${path}[${i}]`)}</td></tr>`;
				})
				html = `<table>${rows}</table>`;
			}
		}else{ // is object
			let keys = Object.keys(obj).filter(k=>k.indexOf('$') == -1);
			let rows = `<tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr>`;
				rows += `<tr>${keys.map(k=>`<td data-path="${path}.${k}">${jsonToTable(obj[k], `${path}.${k}`)}`).join('')}</td></tr>`;
			html = `<table>${rows}</table>`;
		}
	}else{ // is other
		html = `${obj}`;
	}
	return html;
}

function pathValue(obj, path, val){
	path = typeof path == 'string' ? path.split('[').join('.').split('.') : path;
	var attr = path && path.shift();
	if(attr && attr.indexOf(']') != -1)
		attr = attr.replace('[', '').replace(']', '');
	if(val != undefined){
		if(path.length){
			if(obj[attr]){
				pathValue(obj[attr], path, val)
			}else{
				obj[attr] = {};
				pathValue(obj[attr], path, val)
			}
		}else if(val == '_delete_'){
			delete obj[attr];
		}else{
			 obj[attr] = val;
		}
	}else{
		if(attr)
			if(obj)
				return pathValue(obj[attr], path);
			else
				return undefined;
		else
			return obj;
	}
}

function elementPath(el) {
	var names = [];
	while (el.parentNode) {
		if (el.id) {
			names.unshift('#' + el.id);
			break;
		}
		else {
			if (el == el.ownerDocument.documentElement) names.unshift(el.tagName);
			else {
				for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
				names.unshift(el.tagName + ":nth-child(" + c + ")");
			}
			el = el.parentNode;
		}
	}
	return names.join(" > ");
}