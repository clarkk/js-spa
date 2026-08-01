import * as dom from 'dom';
import * as fmt from 'fmt';
import * as frm from 'frm';

let active = null, position_frame = null, panel = null;

export function create(store, parent){
	let container = null, input = null, rendered = false, opened = false, component = null, definition = null;
	
	const o = {
		definition(def){
			if(!arguments.length) return definition;
			
			if(def == null) throw Error('Dropdown definition must be defined');
			
			if(def === definition) return o;
			
			definition = def;
			component = def === frm.DROPDOWN_CALENDAR ? create_calendar(store) : create_list(store, def);
			
			if(opened && active?.container === container){
				component.render(input);
				position();
			}
			
			return o;
		},
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
			return o;
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
				close();
				parent.tab(e);
				return true;
			}
			
			return false;
		}
	};
	
	function position(){
		if(!opened || !input?.isConnected || !panel?.isConnected) return;
		
		const rect = input.getBoundingClientRect();
		
		if(rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth){
			close();
			return;
		}
		
		panel.style.left = rect.left+'px';
		
		const panel_height = panel.offsetHeight, space_below = window.innerHeight - rect.bottom, space_above = rect.top;
		if(space_below >= panel_height || space_below >= space_above) panel.style.top = rect.bottom+'px';
		else panel.style.top = Math.max(0, rect.top-panel_height)+'px';
	}
	
	function open(){
		if(opened) return;
		
		if(!component) throw Error('Dropdown definition is not defined');
		
		if(active && active.container !== container) active.close();
		
		component.render(input);
		
		opened = true;
		panel.classList.add('active');
		active = {
			container,
			position,
			close
		};
		
		position();
	}
	
	function close(){
		if(!opened) return;
		
		opened = false;
		if(active?.container === container){
			panel?.classList.remove('active');
			active = null;
		}
	}
	
	return Object.freeze(o);
}

function create_list(store, def){
	const o = {
		render(input){
			const panel = get_panel();
			panel.innerHTML = `
				<ul class="field-dropdown-list">
					<div class="field-dropdown-label">${store.t(def.label)}</div>
					${def.options.map(option=>`
						<li data-value="${option[0]}">${store.t(option[1])}</li>
					`).join('')}
				</ul>
			`;
			return o;
		}
	};
	return Object.freeze(o);
}

function create_calendar(store){
	const o = {
		render(input){
			const panel = get_panel();
			panel.innerHTML = `
				<div class="field-dropdown-calendar"></div>
			`;
			return o;
		}
	};
	return Object.freeze(o);
}

function get_panel(){
	if(panel?.isConnected) return panel;
	
	panel = document.createElement('div');
	panel.className = 'field-dropdown-panel';
	document.body.append(panel);
	return panel;
}

document.addEventListener('pointerdown', e=>{
	if(inactivate()) return;
	
	if(active.container.contains(e.target) || panel.contains(e.target)) return;
	
	active.close();
});

document.addEventListener('scroll', schedule_position, true);
window.addEventListener('resize', schedule_position);

function schedule_position(){
	if(!active || position_frame !== null) return;
	
	position_frame = requestAnimationFrame(_=>{
		position_frame = null;
		
		if(inactivate()) return;
		
		active.position();
	});
}

function inactivate(){
	if(!active) return true;
	
	if(!active.container.isConnected || !panel?.isConnected){
		active.close();
		return true;
	}
	
	return false;
}