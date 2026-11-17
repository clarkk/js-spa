import * as api from 'api';
import * as frm_types from 'frm_types';

export function is_conversion(err){
	return err instanceof api.HTTP_error && err.status === 422 && err.body?.source === frm_types.SOURCE;
}

export function error(error, convert_error=false){
	return new api.HTTP_error(422, {
		error,
		source: convert_error ? frm_types.SOURCE : null
	});
}