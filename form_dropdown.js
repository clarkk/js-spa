import * as fmt from 'fmt';

export function create(field){
	const o = {
		html(input_id){
			return `
				<div>
					<input id="${input_id}" type="text" autocomplete="nope">
				</div>
			`;
		}
	};
	return Object.freeze(o);
}