// BSD LICENSE
// Author: nokiddin 
function _get_content_type(headers){ //headers can be an array of headers or a single header string.
		var hct ; //content type header serialized
		var charset; //charset part only
		var ct ;  //content-type part only
		var outdata = null;
		if(headers){ //de-multiplex array of headers and a single string header. 
			if(typeof headers =='string')
				hct=headers;
			else (hct = headers["content-type"]);
			
			if(hct){
				var c = hct.split(';');
				if(c[0].trim() == "text/plain"){
					cs = c[1].split('=');
					if(cs[0].trim() == "charset"){
						charset = cs[1].trim();
					}   
					ct = c[0].trim();
				}   

			// we're good if charset looks like utf8 or utf-8  mixed/upper/lowercase etc.
				outdata={ content_type: ct };
				outdata.charset = ((charset.search(/utf-?8/i)>=0)? "utf8":charset);
			}
		}   
		return outdata;
	}

	//derivative of https://gist.github.com/4706967 
	// XXXxhrget 
	//cb is  function(boolean failure, data_t jsonortxt, xhr_t xhrobject)
	// outct is the  content-type desired in the response.
	// jsonortxt is either a json object or a text string.
	function ezxhr(url,cb,outct,timeout){
		return quickxhr(url,cb,{outct:outct,timeout:timeout});
	}

	/*
	options: {
		method : "GET" (default, unless inpobj is set) ; "POST", "HEAD", etc.
		inpobj : non-null if sending an object. Sending invokes the method requested. If set, POST is default method. 
		inpct  : defaults to "application/json" if sending an object.
		outct  : desired content-type in the response. Defaults to "application/json".
		timeout: requested timeout in millisec.
	}
	The default 'options' is : {method:"GET",outct:"application/json",timeout:8000}
	*/
	function quickxhr(url,cb,options){
		cb = cb || function(failure, jsonortxt, xhrobject){}
		options=options||{};
		var post=options.inpobj;
		var inpct=post?(options.inpct||"application/json"):null;
		var method=options.method?options.method.toUpperCase():(post?"POST":"GET");
		var outct=options.outct||"application/json";
		var timeout=options.timeout||8000;
		
		var xhr;
		function failed(e_,cb,xhr){
				var e=(typeof(e_)==="string")?(new Error(e_)):e_; 
				if(console)console.log(e.message);
				return cb(e,null,xhr);
			};
		try{ xhr = new XMLHttpRequest(); }catch(e){
			try{ xhr = new ActiveXObject("MSXML2.XMLHTTP"); }catch (e){
				return failed(e,cb,xhr);
			}
		}
		try{
			var ontimeout=function() {xhr.abort(); return failed("quickxhr: timeout",cb,xhr); } 
			var ftimer;
			ftimer = setTimeout(ontimeout , timeout);
			//TODO: use xhr timeouts : (not all browsers supported)
			//see :https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
			//xhr.ontimeout=ontimeout;
			
			//The below line is stubbed out cuz I don't know how to xlate from progressevt to error. 
			//xhr.onerror=function(progressevt){ failed(null,cb,xhr); }; 
			xhr.onreadystatechange = function() {
				if (xhr.readyState != 4) return;
				clearTimeout(ftimer);
				if(xhr.status == 200){
					var rct=_get_content_type(xhr.getResponseHeader("Content-Type")); 
					if(!rct || rct.content_type!=outct) { return failed("quickxhr: No Content Type",cb,xhr); } 
					var rv = xhr.responseText;
					if(rct.content_type=="application/json"){ try { rv=JSON.parse(rv); } catch(e){ return failed(e,cb,xhr); }}
					return cb(null, rv, xhr); 
				}else { 
					return failed("quickxhr: server response status is "+xhr.status,cb,xhr);
				} 
			}
			xhr.open(method?method.toUpperCase():"GET", url, true);
			xhr.withCredentials = true;

			if(!post){
				xhr.send();
			}else {
				xhr.setRequestHeader('Content-Type', inpct);
				xhr.send(post);
			}
		}catch(e){
			return failed(e,cb,xhr);
		}
	}

	function jsonxhr(url,cb,method,post,reqct,timeout) {
		cb = cb || function(failure, jsonortxt, xhrobject){}
		var ftimer, xhr;
		try{ xhr = new XMLHttpRequest(); }catch(e){
		try{ xhr = new ActiveXObject("Msxml2.XMLHTTP"); }catch (e){
		if(console)console.log("tinyxhr: XMLHttpRequest not supported");
		cb(e);
		}
		}
		ftimer = setTimeout(function() {xhr.abort(); cb(new Error("xhr: aborted by a timeout"), "",xhr); } , timeout?timeout:8000);
		xhr.onreadystatechange = function()
		{
		if (xhr.readyState != 4) return;
		clearTimeout(ftimer);
		if(xhr.status == 200){
		var rct=_get_content_type(xhr.getResponseHeader("Content-Type")); 
		if(!rct){ cb(new Error("Bad Content Type")); return ; } 
		var rtxt=xhr.responseText; 
		var rjson;
		if(rct.content_type=="application/json"){ try { rjson=JSON.parse(rtxt); } catch(e){ cb(e); }}
		cb(false, rjson || rtxt, xhr); 
		}else { 
		cb(new Error("xhr: server response status is "+xhr.status));
		} 
		}
		xhr.open(method?method.toUpperCase():"GET", url, true);

		//xhr.withCredentials = true;

		if(!post)
		xhr.send();
		else {
			xhr.setRequestHeader('Content-Type', reqct?reqct:'application/json');
			xhr.send(post);
		}
	}	
