Array.prototype._flat = Array.prototype.flat;
//fix because someone added a 'flat' to arrays in standards :S
Array.prototype.flat = function(path, placeholder){
	if(path)
		return this.map(function(i){
			let val = pathValue(i, path);
			return i ? placeholder ? val === null ? placeholder : val : val : undefined;
		})
	else
		return this._flat();
}
//Depricating getUnique. not sure where this is used outside of an old unique fn. which is no longer calling this.
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
Array.prototype.unique = function(path){
	var u = [],
		a = [];
    this.forEach(i=>{
        if(path){
            let val = pathValue(i, path);
            if(val && !u.includes(val)){
                u.push(val);
                a.push(i)
            }
        }else{
            if(!a.includes(i))
                a.push(i);
        }
    })
    return a;
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
	var keys = [];
	this.forEach(function(obj){
		if(typeof obj == 'object')
			Object.keys(obj).forEach(function(k){
				keys.push(k)
			})
	})
	return keys.unique();
}
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
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
String.prototype.compile = function(scope){
	let str = this;
	let parts = str.split('}}');
	return parts.map(p=>{
		let p2 = p.split('{{');
		if(p2[1])
			p2[1] = pathValue(scope, p2[1]) || '';
		return p2.join('');
	}).join('');
}


function jsonToTable(obj, path='item', $sanitize=(str)=>str){
	if(localStorage.debug)
		console.log({obj, path, $sanitize})
    var html = ``;
    if(obj && typeof obj == 'object'){
        if(obj.length){ // is array
            if(obj[0] && typeof obj[0] == 'object'){ //array of objects
                var keys = obj.allKeys();
                var rows = `<tr>${keys.map(function(k){return `<th>${k}</th>`}).join('')}</tr>`;
                rows += obj.map(function(row, i){
                    return `<tr>${keys.map(function(k){
                        var p2 = `${path}[${i}].${k}`
                        return `<td data-path="${p2}">${jsonToTable(row[k], p2, $sanitize)}</td>`}).join('')
                    }</tr>`;
                }).join('')
                html = `<table>${rows}</table>`;
            }else if(obj[0]){ // regular array
                var rows = ``;
                obj.forEach(function(row, i){
                    rows += `<tr><td data-path="${path}[${i}]">${jsonToTable(row, `${path}[${i}]`, $sanitize)}</td></tr>`;
                })
                html = `<table>${rows}</table>`;
            }
        }else if(obj.toISOString){
        	html = moment(obj).format('MMM DD YYYY H:mm')
    	}else{ // is object
            var keys = Object.keys(obj).filter(function(k){return k.indexOf('$') == -1});
            let rows = keys.map(k=>{
	            return `<tr>
	            	<td>${k}</td>
	            	<td data-path="${path}.${k}">${jsonToTable(obj[k], `${path}.${k}`, $sanitize)}</td>
	            </tr>`
            }).join('');
            html = `<table>${rows}</table>`;
        }
    }else if(obj){ // is other
        html = $sanitize(`${obj}`);
    }
    return html;
}
// function jsonToTable(obj, path){
// 	var html = ``;
// 	if(obj && typeof obj == 'object'){
// 		if(obj.length){ // is array
// 			if(typeof obj[0] == 'object'){ //array of objects
// 				var keys = obj.allKeys();
// 				var rows = `<tr>${keys.map(function(k){return `<th>${k}</th>`}).join('')}</tr>`;
// 				rows += obj.map(function(row, i){
// 					return `<tr>${keys.map(function(k){
// 						var p2 = `${path}[${i}].${k}`
// 						return `<td data-path="${p2}">${jsonToTable(row[k], p2)}</td>`}).join('')
// 					}</tr>`;
// 				}).join('')
// 				html = `<table>${rows}</table>`;
// 			}else{ // regular array
// 				var rows = ``;
// 				obj.forEach(function(row, i){
// 					rows += `<tr><td data-path="${path}[${i}]">${jsonToTable(row, `${path}[${i}]`)}</td></tr>`;
// 				})
// 				html = `<table>${rows}</table>`;
// 			}
// 		}else{ // is object
// 			var keys = Object.keys(obj).filter(function(k){return k.indexOf('$') == -1});
// 			var rows = `<tr>${keys.map(function(k){ return `<th>${k}</th>` }).join('')}</tr>`;
// 				rows += `<tr>${keys.map(function(k){ return `<td data-path="${path}.${k}">${jsonToTable(obj[k], `${path}.${k}`)}`}).join('')}</td></tr>`;
// 			html = `<table>${rows}</table>`;
// 		}
// 	}else{ // is other
// 		html = `${obj}`;
// 	}
// 	return html;
// }


function pathValue(obj, path, val){
    let parts, attr;
	if(path[0] == '['){
        parts = path.split(']')
        attr = parts.shift().replace('[','');
        path = parts.join(']')
    }else{
    	parts = path.split('.');
        if(parts[0].includes('[')){
            path = parts.join('.')
            parts = path.split('[');
            attr = parts.shift();
            path = '['+parts.join('[')
        }else{
        	attr = parts.shift();
            path = parts.join('.')
        }
    }
    if(path[0] == '.')
        path = path.substring(1);
	if(val !== undefined){
		if(path.length){
			if(obj[attr]){
				pathValue(obj[attr], path, val)
			}else{
				obj[attr] = {};
				pathValue(obj[attr], path, val)
			}
		}else if(val == '_delete_' || val === null || val === ''){
			delete obj[attr];
		}else{
			 obj[attr] = val;
		}
	}else{
		if(attr)
			if(obj)
				return pathValue(obj[attr], path);
			else
				return null;
		else
			return obj;
	}
}

function elementPath(el) {
	var names = [];
	while(!!el.parentNode){
		if(el.id){
			names.unshift('#' + el.id);
			break;
		}else{
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