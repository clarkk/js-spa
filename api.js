let _api_url;

const type_json = 'application/json';

export function init(path){
	_api_url = path;
}

export const client = {
	get(path){
		return request(path, {
			method: 'GET'
		});
	},
	post(path, data){
		return request(path, {
			method: 'POST',
			body: JSON.stringify(data)
		});
	}
};

export function HTTP_error(status, body){
	this.name = "HTTP error";
	this.status = status;
	this.body = body;
}

HTTP_error.prototype = Object.create(Error.prototype);
HTTP_error.prototype.constructor = HTTP_error;

async function request(path, options={}){
	const res = await fetch(_api_url+path, {
		headers: {
			'Content-Type': type_json
		},
		...options
	});
	
	const text = res.headers.get('content-type')?.includes(type_json) ? await res.text() : null, data = text ? JSON.parse(text) : null;
	
	if(!res.ok){
		throw new HTTP_error(res.status, data);
	}
	
	return data;
}