import * as fmt from 'fmt';

export function loader(size='3rem', invert=false){
	return `
		<div class="loader ${invert ? 'invert' : ''}">
			<svg style="--loader-size:${size}" viewBox="25 25 50 50">
				<circle cx="50" cy="50" r="20"></circle>
			</svg>
		</div>
	`;
}

export function map_details(label, count, content=''){
	return `
		<details class="field-map" ${count ? '' : 'hidden'}>
			<summary>
				<i class="bi bi-chevron-right" aria-hidden="true"></i>
				${label ?? ''}
				<span class="field-map-count">${count}</span>
			</summary>
			<div class="field-map-content">${content}</div>
		</details>
	`;
}

export function http_error(err){
	const messages = {
		400: 'Bad request',
		401: 'Unauthorized',
		403: 'Forbidden',
		404: 'Not found',
		500: 'Internal server error'
	}, status = err.status ?? err, text = err.body?.error?.request || messages[status] || 'Error';
	return `
		<div class="text-center">
			<h1><i class="bi bi-x-circle"></i> HTTP ${status}</h1>
			<p>${text}</p>
		</div>
	`;
}