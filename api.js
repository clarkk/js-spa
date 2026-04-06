let _api_url;

const content_json = 'application/json';

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

async function request(path, options={}){
	const res = await fetch(_api_url+path, {
		headers: {
			'Content-Type': content_json
		},
		...options
	});
	
	const data = res.headers.get('content-type')?.includes(content_json) ? await res.json() : null;
	
	if(!res.ok){
		throw {
			status: res.status,
			body: data
		};
	}
	
	return data;
}