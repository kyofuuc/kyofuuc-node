
import assert from "assert";
import { Utils } from "../../lib/helper";

it('validate Utils forEach', () => {
	Utils.forEach(["get", "post", "patch", "delete"], function (key: number, method: any) {
		if (key == 0) assert.equal(method, "get");
		if (key == 1) assert.equal(method, "post");
		if (key == 2) assert.equal(method, "patch");
		if (key == 3) assert.equal(method, "delete");
	});
	Utils.forEach({ one: 1, two: "Two", three: { a: 'A', b: 8 }, four: [1, "Two", {}, []] }, function (key: string, value: any) {
		if (key === "one") assert.equal(1, value);
		if (key === "two") assert.equal("Two", value);
		if (key === "three") assert.deepEqual({ a: 'A', b: 8 }, value);
		if (key === "four") assert.deepEqual([1, "Two", {}, []], value);
	});
});

it('validate Utils mergeObject', () => {
	const obj1 = {
		method: "GET",
		url: "test.com/user",
	};
	const obj2 = {
		method: "POST",
		baseUrl: "https://base.com",
	};
	const merged = Utils.mergeObjects(obj1, obj2);

	assert.equal(merged.url, obj1.url);
	assert.equal(merged.method, obj2.method);
	assert.equal(merged.baseUrl, obj2.baseUrl);
	assert.notEqual(merged.method, obj1.method);
});

it('validate Utils mergeObject cherry pick', () => {
	const obj1 = {
		method: "GET",
		url: "test.com/user",
	};
	const obj2 = {
		method: "POST",
		baseUrl: "https://base.com",
	};
	const merged = Utils.mergeObjects(obj1, obj2, ["baseUrl", "url"]);

	assert.equal(merged.url, obj1.url);
	assert.equal(undefined, merged.method);
	assert.equal(merged.baseUrl, obj2.baseUrl);
});

it('validate Utils isURLSearchParams', () => {
	let url = new URL('https://example.com?foo=1&bar=2');
	let params = new URLSearchParams(url.search);
	var params2 = new URLSearchParams("foo=1&bar=2");
	var params2a = new URLSearchParams("?foo=1&bar=2");
	var params3 = new URLSearchParams([["foo", "1"], ["bar", "2"]]);
	var params4 = new URLSearchParams({ "foo": "1", "bar": "2" });

	assert.equal(true, Utils.isURLSearchParams(params));
	assert.equal(true, Utils.isURLSearchParams(params2));
	assert.equal(true, Utils.isURLSearchParams(params2a));
	assert.equal(true, Utils.isURLSearchParams(params3));
	assert.equal(true, Utils.isURLSearchParams(params4));
	assert.equal(false, Utils.isURLSearchParams(params2.toString()));
});

it('validate Utils encodeParamURI', () => {
	assert.equal("What+[]+is+this", Utils.encodeParamURI("What [] is this"));
	assert.equal("%2B:8374387[]dfyu$%25%23%25", Utils.encodeParamURI("+:8374387[]dfyu$%#%"));
	assert.equal("user:thecarisma%26year:2022%26planet:earth", Utils.encodeParamURI("user:thecarisma&year:2022&planet:earth"));
	assert.equal("user%3Dthecarisma%26year%3D2022%26planet%3Dearth", Utils.encodeParamURI("user=thecarisma&year=2022&planet=earth"));
});

function customParamsSerializer(params: any) {
	let serializedParams = "";
	for (let index = 0; index < Object.keys(params).length; index++) {
		let key = Object.keys(params)[index]
		serializedParams += `CPS_${key}=VALUE_${params[key]}_END`;
		if (index < (Object.keys(params).length) - 1) serializedParams += ",";
	}
	return serializedParams;
}

it('validate Utils buildUrlWithQuery', () => {
	const params = {
		year: 2022,
		planet: "Earth",
		name: "thecarisma",
	};
	const url = new URL('https://example.com?foo=1&bar=2');
	const urlSearchParams = new URLSearchParams(url.search);
	const urlSearchParams2 = new URLSearchParams("foo=1&bar=2");
	const urlSearchParams2a = new URLSearchParams("?foo=1&bar=2");
	const urlSearchParams3 = new URLSearchParams([["foo", "1"], ["bar", "2"]]);
	const urlSearchParams4 = new URLSearchParams({ "foo": "1", "bar": "2" });
	const urlSearchParams5 = new URLSearchParams(params as any);

	assert.equal("https://thecarisma.github.io?CPS_year=VALUE_2022_END,CPS_planet=VALUE_Earth_END,CPS_name=VALUE_thecarisma_END",
		Utils.buildUrlWithQuery("https://thecarisma.github.io", params, customParamsSerializer));
	assert.equal("https://thecarisma.github.io?foo=1&bar=2", Utils.buildUrlWithQuery("https://thecarisma.github.io", urlSearchParams));
	assert.equal("https://thecarisma.github.io?foo=1&bar=2", Utils.buildUrlWithQuery("https://thecarisma.github.io", urlSearchParams2));
	assert.equal("https://thecarisma.github.io?foo=1&bar=2", Utils.buildUrlWithQuery("https://thecarisma.github.io", urlSearchParams2a));
	assert.equal("https://thecarisma.github.io?foo=1&bar=2", Utils.buildUrlWithQuery("https://thecarisma.github.io", urlSearchParams3));
	assert.equal("https://thecarisma.github.io?foo=1&bar=2", Utils.buildUrlWithQuery("https://thecarisma.github.io", urlSearchParams4));
	assert.equal("https://thecarisma.github.io?year=2022&planet=Earth&name=thecarisma", Utils.buildUrlWithQuery("https://thecarisma.github.io", params));
	assert.equal(Utils.buildUrlWithQuery("https://thecarisma.github.io", params), Utils.buildUrlWithQuery("https://thecarisma.github.io", urlSearchParams5));
	assert.equal("https://thecarisma.github.io?year=2022&planet=Earth&name=thecarisma", Utils.buildUrlWithQuery("https://thecarisma.github.io", urlSearchParams5));
});

it('validate Utils buildUrlWithQuery types', () => {
	const date = new Date();
	const params = {
		time: date,
		age: 5677,
		planet: "Earth",
		name: "thecarisma",
		years: [2022, 2023, "beyound"],
	};

	assert.equal(`https://thecarisma.github.io?time=${date.toISOString()}&age=5677&planet=Earth&name=thecarisma&years[]=2022&years[]=2023&years[]=beyound`,
		Utils.buildUrlWithQuery("https://thecarisma.github.io", params));
});

it('validate Utils isAbsoluteURL', () => {
	assert.equal(false, Utils.isAbsoluteURL("google.com"));
	assert.equal(false, Utils.isAbsoluteURL("/user/token"));
	assert.equal(true, Utils.isAbsoluteURL("http://google.com"));
	assert.equal(true, Utils.isAbsoluteURL("https://thecarisma.github.io"));
});

it('validate Utils isRelativeURL', () => {
	assert.equal(true, Utils.isRelativeURL("google.com"));
	assert.equal(true, Utils.isRelativeURL("/user/token"));
	assert.equal(false, Utils.isRelativeURL("http://google.com"));
	assert.equal(false, Utils.isRelativeURL("https://thecarisma.github.io"));
});

it('validate Utils combineUrls', () => {
	assert.equal("google.com/search", Utils.combineUrls("google.com", "search"));
	assert.equal("https://thecarisma.github.io/user/token", Utils.combineUrls("https://thecarisma.github.io/", "/user/token"))
});

it('validate Utils buildFullUrl', () => {
	assert.equal("github.com", Utils.buildFullUrl({ url: "user:password@github.com" }, true));
	assert.equal("github.com", Utils.buildFullUrl({ baseUrl: "user:password@github.com" }, true));
	assert.equal("google.com/search", Utils.buildFullUrl({ baseUrl: "google.com", url: "search" }));
	assert.equal("http://github.com", Utils.buildFullUrl({ url: "http://user:password@github.com" }, true));
	assert.equal("http://search.com", Utils.buildFullUrl({ baseUrl: "google.com", url: "http://search.com" }));
	assert.equal("http://github.com", Utils.buildFullUrl({ baseUrl: "http://user:password@github.com" }, true));
	assert.equal("http://user:password@github.com", Utils.buildFullUrl({ url: "http://user:password@github.com" }));
	assert.equal("http://github.com/org/repo", Utils.buildFullUrl({ baseUrl: "http://github.com", url: "/org/repo" }));
	assert.equal("http://user:password@github.com", Utils.buildFullUrl({ baseUrl: "http://user:password@github.com" }));
	assert.equal("github.com/org/repo", Utils.buildFullUrl({ baseUrl: "user:password@github.com", url: "/org/repo" }, true));
	assert.equal("http://github.com/org/repo", Utils.buildFullUrl({ baseUrl: "http://user:password@github.com", url: "/org/repo" }, true));
	assert.equal("http://user:password@github.com/org/repo", Utils.buildFullUrl({ baseUrl: "http://user:password@github.com", url: "/org/repo" }));
});

it('validate Utils basicAuthFromUrl', () => {
	assert.equal(undefined, Utils.basicAuthFromUrl("github.com"));
	assert.equal(undefined, Utils.basicAuthFromUrl("http://user:password"));
	assert.deepEqual({ username: "", password: "" }, Utils.basicAuthFromUrl(":@github.com"));
	assert.deepEqual({ username: "user", password: "" }, Utils.basicAuthFromUrl("user@github.com"));
	assert.deepEqual({ username: "user", password: "" }, Utils.basicAuthFromUrl("user:@github.com"));
	assert.deepEqual({ username: "", password: "password" }, Utils.basicAuthFromUrl(":password@github.com"));
	assert.deepEqual({ username: "user", password: "password" }, Utils.basicAuthFromUrl("http://user:password@"));
	assert.deepEqual({ username: "user", password: "password" }, Utils.basicAuthFromUrl("user:password@github.com"));
	assert.deepEqual({ username: "user", password: "password" }, Utils.basicAuthFromUrl("http://user:password@github.com"));
	assert.deepEqual({ username: "user", password: "password" }, Utils.basicAuthFromUrl("http://user:password@github.com/org/repo"));
});

/*it('utils.kyofuucError', () => {
	const kError1 = utils.kyofuucError("Test Error 1", {});
	const kError2 = utils.kyofuucError("Test Error 2", { url: "https://thecarisma.github.io"});
	const kError3 = utils.kyofuucError(
		"Test Error 3", 
		{
			url: "https://thecarisma.github.io"
		},
		utils.ERROR_CODES.UNKNOWN_ERRORS);

	assert.equal(kError1.message, "Test Error 1");
	assert.equal(kError2.message, "Test Error 2");
	assert.equal(kError3.message, "Test Error 3");
	assert.deepEqual(kError1.toJSON().config, {});
	assert.deepEqual(kError2.toJSON().config, { url: "https://thecarisma.github.io"});
	assert.deepEqual(kError3.toJSON().config, { url: "https://thecarisma.github.io"});
	assert.deepEqual(kError3.toJSON().code, utils.ERROR_CODES.UNKNOWN_ERRORS);
});*/
