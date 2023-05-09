# Google Maps Jodit plugin

Jodit Google Maps is the plugin for easy inserting and editing Google Maps into the pages. You can specify your office
location, draw the route to it, place all of your travel targets or anything else.

[Demo](#demo)

The main features of this Jodit plugin are:

-   Create points, routes, areas onto the map
-   Customizing size, zoom or center of the map
-   Configuring Google Map type (Roadmap / Sattelite / Hybrid / Relief)
-   Search for objects by street addresses, cities, etc.
-   Editing any of the maps you have inserted before
-   Configuring layers (traffic etc.)

## Options

### googleMaps.API_KEY

-   Type: String
-   Default: ''
-   Required: true

This option is required for Google Maps to work on your site. The cards won't work without it.

```js
Jodit.make('#editor', {
	googleMaps: {
		API_KEY: 'AIzaSyDjnR03hxN8fo0QJ85Jkkvk2DALTh3eynY'
	}
});
```

### googleMaps.apiUrl

-   Type: String
-   Default: 'https://maps.googleapis.com/maps/api/js?key=${j.o.googleMaps.API_KEY}&libraries=geometry,places&language=${j.o.language}&callback=GoogleReadyHandler'

Option for specifying JS API download url.

### googleMaps.useStaticImage

-   Type: boolean
-   Default: false

If True - Do not generate Google Maps JS API, but leave a static image.

### googleMaps.saveStateInStorage

-   Type: Boolean
-   Default: true

If this setting is enabled, the plugin will remember the position and zoom of the map in the local storage.

```js
Jodit.make('#editor', {
	googleMaps: {
		saveStateInStorage: false
	}
});
```

### googleMaps.inlineEditorOptions

-   Type: Object
-   Default:

```js
{ buttons: ['bold', 'italic', 'link', 'brush', 'fontsize', 'image'] }`
```

Text editor settings for markers in the map. You can use any [options from Jodit](https://xdsoft.net/jodit/doc/options/).

```js
Jodit.make('#editor', {
	googleMaps: {
		inlineEditorOptions: {
			buttons: ['bold', 'italic', 'link', 'googleMaps'], // Yes, it works! =)
			filebrowser: {
				// Options
			}
		}
	}
});
```

### googleMaps.map.type

-   Type: 'hybrid' | 'roadmap' | 'satellite' | 'terrain'
-   Default: 'roadmap'

Default card type.

```js
Jodit.make('#editor', {
	googleMaps: {
		map: {
			type: 'hybrid'
		}
	}
});
```

### googleMaps.map.center

-   Type: 'auto' | [number, number]
-   Default: 'auto'

The center of the map to which it will be installed at the first start. If the auto mode is enabled, then geolocation will be requested.

### googleMaps.map.zoom

-   Type: number
-   Default: 10

Default map zoom.

## FAQ

> Q: do I need any API key to use Google Map?

A: Yes, you need API key. [How to create API_KEY for Google Maps](#how-to-create-api-key-for-google-maps). And need set option: [API_KEY](#googlemaps-api-key)

> Q: I see static image instead of Google Maps frame in the Jodit?

A: it is OK, it is just a preview in area of my editor. In the page where HTML code (which you a edit with editor) is
displayed, Google Maps widget is shown.

> Q: Why can't I see elements - circles - on a static picture?

A: [Google Maps Static API](https://developers.google.com/maps/documentation/maps-static/overview) does not support the Circle object.

> Q: Can I show static image on the result page too?

A: Yes, you can change options [useStaticImage](#googlemaps-usestaticimage)

## How to create API_KEY for Google Maps

You can find all the information on [this](https://developers.google.com/maps/documentation/maps-static/get-api-key).

In short, the algorithm is as follows:

1. You need create account [Google Cloud Console](https://console.cloud.google.com/project/_/google/maps-apis/overview) and create new project.
2. In your project you need enable 4 APIs: `Geocoding API`, `Maps JavaScript API`,` Maps Static API` and `Places API`
3. Go to the [Google Cloud Console](https://console.cloud.google.com/project/_/google/maps-apis/overview).
4. Click the project drop-down and select or create the project for which you want to add an API key.
5. Click the menu button and select `Google Maps Platform` > `Credentials`.
6. On the Credentials page, click + `Create Credentials` > `API key`.
7. The API key created dialog displays the newly created API key.
8. Click `Close`.
9. The new API key is listed on the `Credentials` page under API Keys.

> Remember to restrict the API key before using it in production.

1. Open the `Credentials` page and click on your key
2. In the `Application restrictions` field, select `HTTP referrers (websites)` so that your key can only be used on your websites.
3. In `Website restrictions` add all the sites where you allow your key to be used.
4. Here `API restrictions` select:` Geocoding API`, `Maps JavaScript API`,` Maps Static API` and `Places API`
5. Press `Save`
