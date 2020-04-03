# USEEIO Widgets
...

## Widgets

### Impact chart
The impact chart widget shows for a selected set of sectors the LCIA results
of these sectors in comparison to each other where a bar chart is generated
for each LCIA category.

![](./images/impact_chart.png)

It is based on [D3](https://d3js.org/) as its only dependency. Here is
a complete example regarding its usage:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Impact chart example</title>
</head>
<body>
    <div id="impact-chart" style="margin: auto; width: 80%">
    </div>
</body>
<script src="lib/d3.min.js"></script>
<script src="ImpactChart.js"></script>
<script>
    var chart = USEEIO.ImpactChart.on({
        selector: '#impact-chart',
        endpoint: 'http://localhost/api',
        model: 'USEEIO',
    });
    chart.update(['1111A0', '111200', '111400', '112120']);
</script>
</html>
```

The function `USEEIO.ImpactChart.on` creates an instance of an impact chart
and attaches it to an HTML element. It takes a configuration object with the
following fields:

* `selector: string`: the selector of the HTML element (e.g. the ID of a `div`
  element),
* `endpoint: string`: the endpoint of an
  [USEEIO API](https://github.com/USEPA/USEEIO_API) instance
* `apikey: string` (optional): an API key
* `model: string`: the ID of the USEEIO model to use
* `width: number` (optional, default `500`): the width of the chart in pixels
* `height: number` (optional, default `500`): the height of the chart in pixels
* `columns: number` (optional, default `2`): the number of columns in which the
  bar charts are organized
* `responsive: boolean` (optional, experimental): creates a responsive chart

On the returned chart object, the `update` method can be called which takes an
array of sector codes and on optional array of indicator codes as input and
renders the respective charts for this selection. It is intended to call the
`update` method on each selection change of sectors or indicators instead of
recreating the chart object. Here is an example that uses more optional features:

```ts
var chart = USEEIO.ImpactChart.on({
    selector: '#impact-chart',
    endpoint: 'http://localhost/api',
    model: 'USEEIO',
    width: 800,
    height: 400,
    columns: 4,
    responsive: true,
});
chart.update(
    // sector codes
    ['1111A0', '111200', '111400', '112120'],
    // indicator codes
    ['ACID', 'ENRG', 'ETOX', 'EUTR', 'FOOD', 
     'GCC', 'HAPS', 'HAZW', 'HC', 'HNC', 'HRSP', 
     'HTOX', 'LAND', 'METL', 'MINE', 'MSW', 'NREN',
     'OZON', 'PEST', 'REN', 'SMOG', 'WATR']);
```

![](images/impact_chart_options.png)