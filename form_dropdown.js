export function create(){
	let input;
	const o = {
		html(input_id){
			return `
				<div>
					<input id="${input_id}" type="text">
				</div>
			`;
		}
	};
	return Object.freeze(o);
}