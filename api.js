let _api_url;

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
	const response = await fetch(_api_url+path, {
		headers: {
			'Content-Type': 'application/json'
		},
		...options
	});
	
	if(!response.ok) throw response;
	
	return response.json();
}