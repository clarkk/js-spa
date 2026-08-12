let _api_url, _csrf = null;

const content_type='Content-Type', type_json='application/json';

export function init(path){
	_api_url = path;
}

export function init_csrf(csrf){
	_csrf = csrf;
}

export const client = Object.freeze({
	get: (signal, path, etag=null)=>request(signal, path, {
		method: 'GET',
		headers: create_headers().if_match(etag).build()
	}),
	post: (signal, path, data, etag=null)=>request(signal, path, {
		method: 'POST',
		headers: create_headers().if_match(etag).build(),
		body: JSON.stringify(data)
	}),
	post_idempotency(signal, path, data, etag=null){
		const headers = create_headers().idempotency().if_match(etag).build(), data_send = JSON.stringify(data), exec = _=>request(signal, path, {
			method: 'POST',
			headers,
			body: data_send
		});
		return {
			request: exec(),
			replay(){
				return exec();
			}
		}
	}
});

export function HTTP_error(status, body){
	const msg = 'HTTP '+status;
	Error.call(this, msg);
	this.name = 'HTTP error';
	this.message = msg;
	this.status = status;
	this.body = body;
	if(Error.captureStackTrace) Error.captureStackTrace(this, HTTP_error);
}
HTTP_error.prototype = Object.create(Error.prototype);
HTTP_error.prototype.constructor = HTTP_error;

export function Response_JSON_error(status, err, text){
	const msg = 'Invalid JSON response: '+err.message;
	Error.call(this, msg);
	this.name = 'Response JSON error';
	this.message = msg;
	this.status = status;
	this.text = text;
	this.cause = err;
	if(Error.captureStackTrace) Error.captureStackTrace(this, Response_JSON_error);
}
Response_JSON_error.prototype = Object.create(Error.prototype);
Response_JSON_error.prototype.constructor = Response_JSON_error;

async function request(signal, path, options={}){
	if(typeof _api_url !== 'string') throw Error('API client has not been initialized');
	
	const headers = {...options.headers};
	if(options.body != null && !headers[content_type]) headers[content_type] = type_json;
	
	if(_csrf){
		const csrf_headers = _csrf.headers(options.method);
		if(csrf_headers) Object.assign(headers, csrf_headers);
	}
	
	try{
		const res = await fetch(_api_url+path, {
			...options,
			signal,
			headers
		});
		
		const text = await res.text(), is_json = res.headers.get(content_type)?.includes(type_json);
		
		let data = null;
		if(text.trim()){
			if(is_json){
				try{
					data = JSON.parse(text);
				}
				catch(err){
					throw new Response_JSON_error(res.status, err, text);
				}
			}
			else data = text;
		}
		
		if(!res.ok) throw new HTTP_error(res.status, data);
		
		return data;
	}
	catch(err){
		if(signal?.aborted) return;
		throw err;
	}
}

function create_headers(){
	const headers = {};
	return {
		if_match(etag){
			if(etag !== null) headers['If-Match'] = etag;
			return this;
		},
		idempotency(){
			headers['Idempotency-Key'] = crypto.randomUUID();
			return this;
		},
		build(){
			return headers;
		}
	};
}