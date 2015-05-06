var Locale = "en";
var textLang = $(".lang");
var imgLang = $("img");

var Lang = {
	data: null,

	get : function( id ) {
		return 'ya';//data[id];
	}
};

document.addEventListener("deviceready", initLocale, false);

function initLocale() {
	navigator.globalization.getPreferredLanguage(
	    function (language) {
			Locale =language.value.split("-")[0];
			successLocale();
		},
	    function () {errorLocale();}
	);
}

function successLocale() 
{
	alert ("language: " + Locale);
	$.getJSON("lang.json", function(lang)
	{

		Lang.data = lang;

		for (var i = 0; i < textLang.length; i++) 
		{
			if (textLang[i].hasAttribute("data-lang"))
			{
				textLang[i].textContent = lang[textLang[i].getAttribute("data-lang")][Locale];
			}
		}
		for (var i = 0; i < imgLang.length; i++)
		{
			if (imgLang[i].hasAttribute("alt"))
			{
				imgLang[i].setAttribute("alt", lang[imgLang[i].getAttribute("alt")][Locale]);
			}
		}

		//document.dispatchEvent()
	});
}

function errorLocale() 
{
	alert ("Locale error");
	Locale = "en";
}