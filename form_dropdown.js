import * as dom from 'dom';
import * as fmt from 'fmt';
import * as frm from 'frm';

let active = null;

export function create(field){
	let container = null, input = null, rendered = false, opened = false;
	const calendar = field.dropdown === frm.DROPDOWN_CALENDAR, o = {
		render(elm, input_id){
			if(rendered) throw Error(`Dropdown is already rendered`);
			
			const container_id = dom.id();
			rendered = true;
			elm.innerHTML = `
				<div id="${container_id}">
					<input id="${input_id}" type="text" autocomplete="nope">
				</div>
			`;
			
			container = document.getElementById(container_id);
			input = document.getElementById(input_id);
			
			input.addEventListener('focus', _=>{
				open();
			});
		},
		keydown(e){
			switch(e.key){
			case frm.KEY_ESC:
				if(!opened) return false;
				
				e.preventDefault();
				close();
				return true;
				
			case frm.KEY_ARROW_DOWN:
			case frm.KEY_ARROW_UP:
				e.preventDefault();
				open();
				return true;
				
			case frm.KEY_ENTER:
			case frm.KEY_TAB:
				if(!opened) return false;
				
				e.preventDefault();
				return true;
			}
		}
	};
	
	function open(){
		if(opened) return;
		
		if(active && active.container !== container) active.close();
		
		opened = true;
		active = {
			container,
			close
		};
		
		if(calendar){
			create_calendar();
		}
		else{
			create_list();
		}
	}
	
	function close(){
		if(!opened) return;
		
		opened = false;
		if(active?.container === container) active = null;
	}
	
	return Object.freeze(o);
}

function create_list(){
	const o = {};
	return Object.freeze(o);
}

function create_calendar(){
	const o = {};
	return Object.freeze(o);
}

document.addEventListener('pointerdown', e=>{
	if(!active) return;
	
	if(!active.container.isConnected){
		active = null;
		return;
	}
	
	if(active.container.contains(e.target)) return;
	
	active.close();
});