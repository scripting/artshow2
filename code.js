const myProductName = "ArtShow2", myVersion = "0.4.0";  

const appConsts = {
	serverUrl: "https://feedland.com/",
	readinglistUrl: "https://lists.feedcorps.org/artshow.opml"
	}
var config = {
	ctSecsBetweenSwitches: 5,
	fadeRate: "slow"
	}

var globals = {
	artLibrary: new Array (),
	flPaused: false,
	whenLastSwitch: new Date (0),
	ixlastart: 0,
	flImageShowing: false
	}
var feedCache = new Object ();
var appPrefs = { //outline routines need this
	outlineFont: "Ubuntu",
	outlineFontSize: 14,
	outlineLineHeight: 24
	};

function htmlLink (url, text) {
	return ("<a href=\"" + url + "\" target=\"_blank\">" + text + "</a>");
	}
function httpRequest (url, timeout, headers, callback) { 
	timeout = (timeout === undefined) ? 30000 : timeout;
	var jxhr = $.ajax ({ 
		url: url,
		dataType: "text", 
		headers,
		timeout
		}) 
	.success (function (data, status) { 
		callback (undefined, data);
		}) 
	.error (function (status) { 
		var message;
		try { //9/18/21 by DW
			message = JSON.parse (status.responseText).message;
			}
		catch (err) {
			message = status.responseText;
			}
		if ((message === undefined) || (message.length == 0)) { //7/22/22 by DW & 8/31/22 by DW
			message = "There was an error communicating with the server.";
			}
		var err = {
			code: status.status,
			message
			};
		callback (err);
		});
	}
function getRiver (readinglistUrl, callback) {
	const url = appConsts.serverUrl + "getriverfromreadinglist?url=" + encodeURIComponent (readinglistUrl);
	httpRequest (url, undefined, undefined, function (err, jsontext) {
		if (err) {
			console.log ("servercall: url == " + url + ", err.message == " + err.message);
			callback (err);
			}
		else {
			callback (undefined, JSON.parse (jsontext));
			}
		});
	}

function getFeed (feedUrl, callback) {
	function getActualFeed (feedUrl, callback) {
		const url = appConsts.serverUrl + "getfeed?url=" + encodeURIComponent (feedUrl);
		httpRequest (url, undefined, undefined, function (err, jsontext) {
			if (err) {
				callback (err);
				}
			else {
				callback (undefined, JSON.parse (jsontext));
				}
			});
		}
	if (feedCache [feedUrl] === undefined) {
		getActualFeed (feedUrl, function (err, theFeed) {
			if (err) {
				callback (err);
				}
			else {
				feedCache [feedUrl] = {
					when: new Date (),
					theFeed
					};
				callback (undefined, theFeed);
				}
			});
		}
	else {
		callback (undefined, feedCache [feedUrl].theFeed);
		}
	}

function viewPaused () {
	var s = "";
	if (globals.flPaused) {
		s = "PAUSED";
		}
	$(".divPausedMessage").html (s);
	}
function viewInfoAboutTheArt (item) {
	moveOutlineCursorToFeed (item.feedUrl);
	return;
	
	
	console.log ("viewInfoAboutTheArt: item == " + jsonStringify (item));
	getFeed (item.feedUrl, function (err, theFeed) {
		
		
		$(".divFeedTitle").html (htmlLink (item.link, theFeed.title));
		return;
		
		
		const theTable = $("<table class=\"table tableForFeedPage\"></table>");
		function getRow (name, val, tipText) {
			var theRow = $("<tr></tr>");
			
			var nameObject = $("<span>" + name + ":</span>");
			if (tipText !== undefined) {
				addToolTip (nameObject, tipText);
				}
			var tdName = $("<td class=\"tdLabel\"></td>");
			tdName.append (nameObject);
			theRow.append (tdName);
			
			var tdForVal = $("<td></td>");
			tdForVal.append (val);
			theRow.append (tdForVal)
			
			return (theRow);
			}
		
		function getFeedDescription () {
			const theDescription = $("<span>" + theFeed.description + "</span>");
			return (theDescription);
			}
		
		function getFeedTitle () {
			const theTitle = $("<span class=\"spFeedTitle\">" + htmlLink (item.link, theFeed.title) + "</span>");
			return (theTitle);
			}
		function getLink () {
			const theLink = $("<span>" + htmlLink (item.link, "<div class=\"divXmlIcon\">XML</div>") + "</span>");
			return (theLink);
			}
		function getHtmltext () {
			const theHtmltext = $("<span>" + item.description + "</span>");
			return (theHtmltext);
			}
		function getMarkdowntext () {
			const theMarkdowntext = $("<span>" + item.markdowntext + "</span>");
			return (theMarkdowntext);
			}
		theTable.append (getRow ("Feed", getFeedTitle ()))
		theTable.append (getRow ("Link", getLink ()))
		theTable.append (getRow ("Text", getHtmltext ()))
		whereToAppend.empty ();
		whereToAppend.append (theTable);
		});
	}
function viewArt (ixArray, theContainer) {
	const item = globals.artLibrary [ixArray];
	const theImage = $(".imgArtImage");
	function fadeout (callback) {
		if (globals.flImageShowing) {
			theImage.fadeOut (config.fadeRate, function () {
				theImage.attr ("src", "");
				theImage.css ("display", "block");
				callback ();
				});
			}
		else {
			callback ();
			}
		}
	fadeout (function () {
		viewInfoAboutTheArt (item);
		theImage.attr ("src", item.enclosure.url);
		theImage.on ("load", function () {
			globals.flImageShowing = true;
			
			const ratio = theContainer.width () / theImage.width ();
			const width = theContainer.width ();
			const height = theImage.height () * ratio;
			
			theImage.attr ("height", height);
			theImage.attr ("width", width);
			
			theImage.fadeIn (config.fadeRate, function () {
				});
			});
		});
	}
function viewRandomArt () {
	while (true) { //never repeat the same work of art
		var ix = random (0, globals.artLibrary.length - 1);
		if (ix !== globals.ixlastart) {
			viewArt (ix, $(".divPageBody"));
			globals.ixlastart = ix;
			break;
			}
		}
	}
function switchArtIfReady () {
	if (!globals.flPaused) {
		if (secondsSince (globals.whenLastSwitch) >= config.ctSecsBetweenSwitches) {
			globals.whenLastSwitch = new Date ();
			viewRandomArt ();
			}
		}
	}

function loadReadingListAsOutline (callback) { //11/15/23 by DW
	const url = appConsts.readinglistUrl;
	httpRequest (url, undefined, undefined, function (err, opmltext) {
		if (err) {
			console.log ("loadReadingListAsOutline: url == " + url + ", err.message == " + err.message);
			alertDialog (err.message);
			}
		else {
			opInitOutliner (opmltext, true, true);
			}
		callback ();
		});
	}
function moveOutlineCursorToFeed (feedUrl) { //11/15/23 by DW
	opFirstSummit ();
	while (true) {
		if (opGetOneAtt ("xmlUrl") == feedUrl) {
			break;
			}
		if (!opGo (down, 1)) {
			opFirstSummit ();
			break;
			}
		}
	}

function loadArtLibrary (callback) {
	var library = new Array ();
	getRiver (appConsts.readinglistUrl, function (err, river) {
		if (err) {
			callback (err);
			}
		else {
			river.feeds.forEach (function (feed) {
				feed.items.forEach (function (item) {
					if (item.enclosure !== undefined) {
						if (item.enclosure.type !== undefined) {
							if (beginsWith (item.enclosure.type, "image/")) {
								library.push (item);
								}
							}
						}
					});
				});
			callback (undefined, library);
			}
		});
	}

function everyMinute () {
	var now = new Date ();
	if (now.getMinutes () == 0) {
		console.log ("\neveryMinute: " + now.toLocaleTimeString () + ", v" + myVersion);
		}
	}
function everySecond () {
	switchArtIfReady ();
	}
function handleClick () {
	console.log ("handleClick");
	globals.flPaused = !globals.flPaused;
	viewPaused ();
	if (!globals.flPaused) { //cause an immediate switch
		viewRandomArt ();
		}
	}
function startup () {
	console.log ("startup");
	loadReadingListAsOutline (function () {
		loadArtLibrary (function (err, theLibrary) {
			if (err) {
				alertDialog (err.message);
				}
			else {
				globals.artLibrary = theLibrary;
				$(".imgArtImage").on ("click", handleClick);
				self.setInterval (everySecond, 1000); 
				runEveryMinute (everyMinute);
				}
			hitCounter ();
			});
		});
	}
