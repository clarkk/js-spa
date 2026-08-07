import * as dom from 'dom';
import * as fmt from 'fmt';
import * as frm from 'frm';

let active = null, position_frame = null, panel = null;

const CLASS_SELECTED='selected';

export function create(store, parent, value){
	let container = null, input = null, input_select = null, rendered = false, opened = false, component = null, definition = null;
	const input_select_id = dom.id(), o = {
		definition(def){
			if(!arguments.length) return definition;
			
			if(def == null) throw Error('Dropdown definition must be defined');
			if(!rendered) throw Error(`Dropdown is not rendered`);
			
			if(def === definition) return o;
			
			definition = def;
			component = def === frm.DROPDOWN_CALENDAR ? create_calendar(store, input, input_select) : create_list(store, def, input, input_select);
			component.init(value);
			input.readOnly = o.select();
			
			if(opened && active?.container === container){
				component.render();
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
					<input id="${input_select_id}" type="hidden">
				</div>
			`;
			
			container = document.getElementById(container_id);
			input = document.getElementById(input_id);
			input_select = document.getElementById(input_select_id);
			
			input.addEventListener('focus', _=>{
				open();
			});
			input.addEventListener('click', _=>{
				open();
			});
			return o;
		},
		select(){
			return !!component?.select?.();
		},
		val(value){
			if(!arguments.length) return o.select() ? input_select.value : input.value;
			
			if(value !== undefined){
				if(o.select()) input_select.value = value;
				else input.value = value;
			}
		},
		keydown(e){
			switch(e.key){
			case frm.KEY_ESC:
				if(!opened) return false;
				
				e.preventDefault();
				close();
				return true;
				
			case frm.KEY_ARROW_DOWN:
				e.preventDefault();
				open();
				component.down();
				return true;
				
			case frm.KEY_ARROW_UP:
				e.preventDefault();
				open();
				component.up();
				return true;
				
			case frm.KEY_ENTER:
				if(!opened) return false;
				
				e.preventDefault();
				component.choose();
				close();
				return true;
				
			case frm.KEY_TAB:
				if(!opened) return false;
				
				e.preventDefault();
				component.choose();
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
		
		component.render();
		
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

function create_list(store, def, input, input_select){
	let options = [], filtered = [], selected = -1, searching = false, items = null;
	const o = {
		init(value){
			load_options();
			
			if(o.select()){
				const option = value === undefined ? options[0] : options.find(option=>option.value === String(value)) ?? options[0];
				input_select.value = option?.value ?? '';
				input.value = option?.text ?? '';
			}
			else input.value = value ?? '';
		},
		render(){
			const panel = get_panel();
			panel.innerHTML = `
				<div class="field-dropdown-label">${store.t(def.label)}</div>
				<ul class="field-dropdown-list">
					${filtered.map((option, i)=>`
						<li class="${i === selected ? CLASS_SELECTED : ''}" data-index="${i}">${fmt.html(option.text)}</li>
					`).join('')}
				</ul>
			`;
			items = panel.querySelectorAll('li');
			return o;
		},
		down(){
			move(1);
		},
		up(){
			move(-1);
		},
		choose(){
			if(selected === -1) return;
			
			const option = filtered[selected];
			if(o.select()){
				input_select.value = option.value;
				input.value = option.text;
			}
			else{
				
			}
		},
		select(){
			return !!def.select;
		}
	};
	
	function load_options(){
		options = def.options(store).map(([value, text])=>({
			value: String(value),
			text
		}));
		
		filter();
	}
	
	function move(direction){
		if(!filtered.length) return;
		
		const previous = selected;
		selected += direction;
		if(selected < 0) selected = filtered.length - 1;
		else if(selected >= filtered.length) selected = 0;
		
		items[previous]?.classList.remove(CLASS_SELECTED);
		items[selected]?.classList.add(CLASS_SELECTED);
		items[selected]?.scrollIntoView({
			block: 'nearest'
		});
	}
	
	function filter(){
		if(o.select()) filtered = options;
		else{
			const search = input.value.trim().toLowerCase();
			filtered = options.filter(option=>
				option.text.toLowerCase().includes(search)
			);
		}
		selected = filtered.length ? 0 : -1;
	}
	
	return Object.freeze(o);
}

function create_calendar(store, input, input_select){
	const o = {
		init(value){
			
		},
		render(){
			const panel = get_panel();
			panel.innerHTML = `
				<div class="field-dropdown-calendar">
					
				</div>
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