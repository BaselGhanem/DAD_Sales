window.JordanSalesMap = (() => {
  const bounds = [[34.90,29.15],[39.35,33.43]];
  const empty = features => ({type:`FeatureCollection`,features});
  const point = (coordinates, properties) => ({type:`Feature`,geometry:{type:`Point`,coordinates},properties});
  const fmt = new Intl.NumberFormat(`en-US`, {maximumFractionDigits:0});
  const reduceMotion = matchMedia(`(prefers-reduced-motion: reduce)`).matches;
  const mapVersion = `5.24.0`;
  const library = `https://cdn.jsdelivr.net/npm/maplibre-gl@${mapVersion}/dist/`;
  const cache = new Map();

  function insideRing([x,y], ring) {
    let inside = false;
    for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const [a,b] = ring[i], [c,d] = ring[j];
      if ((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) inside=!inside;
    }
    return inside;
  }

  function insideGovernorate(position, feature) {
    const {type,coordinates} = feature.geometry;
    const polygons = type===`Polygon` ? [coordinates] : coordinates;
    return polygons.some(([outer,...holes]) => insideRing(position,outer) && !holes.some(ring=>insideRing(position,ring)));
  }

  function illustrativePosition(customer, area, anchor, governorates) {
    const id = JSON.stringify([customer,area,anchor.lng,anchor.lat]);
    if (cache.has(id)) return cache.get(id);
    const governorate = governorates.get(anchor.governorate);
    if (!governorate) return null;
    let seed = 2166136261;
    for (const char of id) seed = Math.imul(seed^char.codePointAt(0),16777619);
    const random = () => {
      seed = (Math.imul(seed,1664525)+1013904223)>>>0;
      return seed/4294967296;
    };
    for (let i=0;i<75;i++) {
      const angle = random()*Math.PI*2, distance = anchor.radius*Math.sqrt(random());
      const position = [anchor.lng+distance*Math.cos(angle),anchor.lat+distance*Math.sin(angle)*.84];
      if (insideGovernorate(position,governorate)) {
        cache.set(id,position);
        return position;
      }
    }
    cache.set(id,null);
    return null;
  }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function action(text, click, className) {
    const node = element(`button`,text,className);
    node.type = `button`;
    if (click) node.addEventListener(`click`,click);
    return node;
  }

  function customerButton(client, includeArea = false) {
    const button = action(null,null,`jmap-row`);
    button.dataset.profileCustomer = client.customer;
    const text = element(`span`);
    const name = element(`bdi`,client.name);
    text.append(name);
    if (includeArea) text.append(element(`small`,client.area));
    button.append(text,element(`strong`,fmt.format(client.net)));
    return button;
  }

  function create(host, selectArea) {
    const mapHost = host.querySelector(`.jmap-map`);
    const status = host.querySelector(`.jmap-status`);
    const areaPicker = host.querySelector(`.jmap-area`);
    const chainList = host.querySelector(`.jmap-chains-list`);
    const unknownList = host.querySelector(`.jmap-unknown-list`);
    const overview = host.querySelector(`.jmap-overview`);
    const reset = host.querySelector(`.jmap-reset`);
    const terrainButton = host.querySelector(`.jmap-terrain`);
    const {normalize,forCustomer,verifiedLocation} = window.JordanMapLocations;
    const chainArea = normalize(`آخرين`);
    let map, popup, hover, hoveredFeature, geography, ready = false, loaded = false, failed = false, terrain = true, clients = [];
    let elevationErrors = 0;
    let focusKey, mapped = [], governorateSales = new Map();

    function visibleBounds() {
      return mapped.length ? mapped.reduce((box,feature)=>box.extend(feature.geometry.coordinates),
        new maplibregl.LngLatBounds()) : null;
    }

    function fit(target, animate = true) {
      if (!target) return;
      map.fitBounds(target,{padding:mapHost.clientWidth<480?48:76,maxZoom:14,
        duration:animate&&!reduceMotion?650:0,pitch:terrain?36:0,bearing:0});
    }

    function clearHover() {
      hover?.remove();
      hoveredFeature=undefined;
      map.getCanvas().style.cursor=``;
    }

    function updateMap() {
      if (!ready) return;
      clearHover();
      map.getSource(`customers`).setData(empty(mapped));
      popup?.remove();
      status.hidden=!!mapped.length;
      status.textContent=`No mapped customers match the current filters.`;
      reset.disabled=!mapped.length;
      const target=visibleBounds();
      const key=JSON.stringify(target?.toArray() ?? []);
      const scale = Math.max(1,...Array.from(governorateSales.values(),Math.abs));
      map.getSource(`governorates`).setData(empty([...geography.values()]
        .filter(feature=>governorateSales.has(feature.properties.shapeName)).map(feature=>{
          const net = governorateSales.get(feature.properties.shapeName);
          return {...feature,properties:{...feature.properties,salesIntensity:Math.sign(net)*Math.sqrt(Math.abs(net)/scale)}};
        })));
      if (key!==focusKey) {
        fit(target,focusKey!==undefined);
        focusKey=key;
      }
    }

    function syncClients() {
      const chains = [], unknown = [];
      mapped = [];
      governorateSales = new Map();
      for (const client of clients) {
        if (normalize(client.area)===chainArea) {
          chains.push(client);
          continue;
        }
        if (!geography || failed) {
          if (failed) unknown.push(client);
          continue;
        }
        const verified = verifiedLocation(client.name);
        const anchor = forCustomer(client.area,client.name);
        const position = verified?.position || (anchor && illustrativePosition(client.customer,client.area,anchor,geography));
        if (position) {
          const governorate = verified?.governorate || anchor.governorate;
          governorateSales.set(governorate,(governorateSales.get(governorate)||0)+client.net);
          mapped.push(point(position,{...client,governorate,source:verified?.source || ``}));
        } else unknown.push(client);
      }
      const chainAccounts = new Map();
      for (const client of chains) {
        const prior = chainAccounts.get(client.customer);
        chainAccounts.set(client.customer, {...client,net:client.net+(prior?.net||0)});
      }
      const chainClients = [...chainAccounts.values()].sort((a,b)=>b.net-a.net);
      chainList.replaceChildren(...chainClients.map(client=>customerButton(client)));
      chainList.closest(`details`).hidden = !chainClients.length;
      host.querySelector(`.jmap-chains-total`).textContent =
        `${fmt.format(chainClients.reduce((sum,client)=>sum+client.net,0))} · ${chainClients.length} accounts`;
      unknownList.replaceChildren(...unknown.map(client=>customerButton(client,true)));
      unknownList.closest(`details`).hidden = !unknown.length;
      overview.textContent = geography && !failed
        ? `${new Set(mapped.map(f=>f.properties.customer)).size} mapped accounts · ${new Set(mapped.map(f=>f.properties.area)).size} sales areas`
        : ``;
      updateMap();
    }

    async function load() {
      if (loaded) return;
      loaded = true;
      status.textContent = `Loading Jordan terrain…`;
      const css = element(`link`);
      css.rel=`stylesheet`;
      css.href=`${library}maplibre-gl.css`;
      document.head.append(css);
      try {
        const [,boundary] = await Promise.all([
          new Promise((resolve,reject)=>{
            const script=element(`script`);
            script.src=`${library}maplibre-gl.js`;
            script.onload=resolve;
            script.onerror=reject;
            document.head.append(script);
          }),
          fetch(`jordan-governorates.geojson?v=1`).then(r=>{
            if (!r.ok) throw Error(`Boundary request failed`);
            return r.json();
          })
        ]);
        geography = new Map(boundary.features.map(f=>[f.properties.shapeName,f]));
        syncClients();
        map = new maplibregl.Map({
          container:mapHost, bounds:visibleBounds() || bounds, fitBoundsOptions:{padding:45,maxZoom:14}, minZoom:4.8,maxZoom:16,
          maxBounds:[[33.5,27.9],[41,34.6]],renderWorldCopies:false,scrollZoom:false,
          pitch:36,bearing:0,
          style:{version:8,glyphs:`https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf`,
            sources:{
              elevation:{type:`raster-dem`,tiles:[`https://tiles.mapterhorn.com/{z}/{x}/{y}.webp`],
                encoding:`terrarium`,tileSize:512,maxzoom:12,attribution:`<a href="https://mapterhorn.com/attribution">© Mapterhorn</a>`},
              basemap:{type:`vector`,url:`https://tiles.openfreemap.org/planet`},
              governorates:{type:`geojson`,data:boundary,attribution:`<a href="https://www.geoboundaries.org/">geoBoundaries / Wikimedia · CC BY 2.5</a>`},
              customers:{type:`geojson`,data:empty([]),cluster:true,clusterMaxZoom:12,clusterRadius:42,clusterProperties:{net:[`+`,[`get`,`net`]]}}
            },
            layers:[
              {id:`base`,type:`background`,paint:{[`background-color`]:`#dce6e3`}},
              {id:`land`,type:`fill`,source:`governorates`,paint:{[`fill-color`]:[`interpolate`,[`linear`],[`coalesce`,[`get`,`salesIntensity`],0],
                -1,`#d6a1a6`,0,`#f8ead5`,1,`#76bbb0`],[`fill-opacity`]:0.84}},
              {id:`relief`,type:`hillshade`,source:`elevation`,paint:{[`hillshade-exaggeration`]:0.52,
                [`hillshade-shadow-color`]:`#665b44`,[`hillshade-highlight-color`]:`#fff7e8`,[`hillshade-accent-color`]:`#aa9575`}},
              {id:`water`,type:`fill`,source:`basemap`,[`source-layer`]:`water`,
                paint:{[`fill-color`]:`#a7c9d1`,[`fill-opacity`]:0.87}},
              {id:`roads`,type:`line`,source:`basemap`,[`source-layer`]:`transportation`,minzoom:7,
                filter:[`match`,[`get`,`class`],[`motorway`,`trunk`,`primary`,`secondary`,`tertiary`],true,false],
                layout:{[`line-join`]:`round`,[`line-cap`]:`round`},
                paint:{[`line-color`]:`#fff9ea`,[`line-opacity`]:0.76,
                  [`line-width`]:[`interpolate`,[`linear`],[`zoom`],7,0.35,14,2.2]}},
              {id:`borders`,type:`line`,source:`governorates`,paint:{[`line-color`]:`#2b6768`,[`line-width`]:1.25,[`line-opacity`]:0.58}},
              {id:`places`,type:`symbol`,source:`basemap`,[`source-layer`]:`place`,minzoom:5,
                filter:[`match`,[`get`,`class`],[`city`,`town`,`village`],true,false],
                layout:{[`text-field`]:[`coalesce`,[`get`,`name:en`],[`get`,`name:latin`],``],
                  [`text-font`]:[`Noto Sans Regular`],[`text-size`]:[`match`,[`get`,`class`],`city`,14,`town`,12,10]},
                paint:{[`text-color`]:`#204b50`,[`text-halo-color`]:`#fffbf1`,[`text-halo-width`]:1.1}},
              {id:`clusters`,type:`circle`,source:`customers`,filter:[`has`,`point_count`],paint:{
                [`circle-color`]:`#087f83`,[`circle-stroke-color`]:`#fff`,[`circle-stroke-width`]:2,
                [`circle-radius`]:[`step`,[`get`,`point_count`],15,12,19,60,25]}},
              {id:`count`,type:`symbol`,source:`customers`,filter:[`has`,`point_count`],
                layout:{[`text-field`]:[`get`,`point_count_abbreviated`],[`text-font`]:[`Noto Sans Regular`],[`text-size`]:13},
                paint:{[`text-color`]:`#fff`}},
              {id:`accounts`,type:`circle`,source:`customers`,filter:[`!`,[`has`,`point_count`]],paint:{
                [`circle-color`]:[`case`,[`<`,[`get`,`net`],0],`#a75264`,`#099999`],
                [`circle-radius`]:[`interpolate`,[`linear`],[`abs`,[`get`,`net`]],0,5,5000,8,50000,12],[`circle-stroke-color`]:`#fff`,[`circle-stroke-width`]:1.8}}
            ]
          }
        });
        map.addControl(new maplibregl.NavigationControl(),`top-right`);
        map.addControl(new maplibregl.ScaleControl({unit:`metric`}),`bottom-left`);
        map.on(`error`,event=>{
          if (event.sourceId===`elevation` && terrain && ++elevationErrors>=4) {
            terrain=false;
            map.setTerrain(null);
            map.setLayoutProperty(`relief`,`visibility`,`none`);
            terrainButton.disabled=true;
            terrainButton.setAttribute(`aria-pressed`,`false`);
            terrainButton.textContent=`3D unavailable`;
            map.easeTo({pitch:0,bearing:0,duration:0});
          }
        });
        map.once(`load`,()=>{
          ready=true;
          if (terrain) map.setTerrain({source:`elevation`,exaggeration:1.35});
          terrainButton.disabled=!terrain;
          updateMap();
        });
        map.on(`click`,`clusters`,async event=>{
          clearHover();
          const cluster=event.features[0], zoom=await map.getSource(`customers`).getClusterExpansionZoom(cluster.properties.cluster_id).catch(()=>null);
          if (zoom!==null) map.easeTo({center:cluster.geometry.coordinates,zoom,duration:reduceMotion?0:500});
        });
        map.on(`click`,`accounts`,event=>{
          clearHover();
          const feature=event.features[0], client=feature.properties;
          const content=element(`div`,null,`jmap-popup`);
          content.append(element(`strong`,client.name),element(`small`,client.area),
            element(`span`,`Net sales · ${fmt.format(client.net)}`),
            element(`small`,client.source?`Published location`:`Illustrative location`));
          if (client.source) {
            const link=element(`a`,`Location source`);
            link.href=client.source;
            link.target=`_blank`;
            link.rel=`noopener noreferrer`;
            content.append(link);
          }
          const open=action(`Open customer profile`);
          open.dataset.profileCustomer=client.customer;
          content.append(open);
          popup?.remove();
          popup=new maplibregl.Popup({offset:12,maxWidth:`250px`}).setLngLat(feature.geometry.coordinates).setDOMContent(content).addTo(map);
        });
        hover=new maplibregl.Popup({className:`jmap-hover`,closeButton:false,closeOnClick:false,
          focusAfterOpen:false,offset:13,maxWidth:`240px`});
        map.on(`mousemove`,event=>{
          const feature=map.queryRenderedFeatures(event.point,{layers:[`accounts`,`clusters`]})[0];
          if (!feature || popup?.isOpen() || map.isMoving()) {
            clearHover();
            return;
          }
          const data=feature.properties;
          const key=JSON.stringify([data.cluster_id,data.customer,data.area]);
          if (key!==hoveredFeature) {
            const content=element(`div`,null,`jmap-popup`);
            if (data.cluster) {
              content.append(element(`strong`,`${fmt.format(data.point_count)} customer locations`),
                element(`span`,`Net sales · ${fmt.format(data.net)}`),element(`small`,`Click to zoom in`));
            } else {
              content.append(element(`strong`,data.name),element(`small`,data.area),
                element(`span`,`Net sales · ${fmt.format(data.net)}`),
                element(`small`,data.source?`Published location`:`Illustrative location`));
            }
            hover.setDOMContent(content);
            hoveredFeature=key;
          }
          hover.setLngLat(event.lngLat);
          if (!hover.isOpen()) hover.addTo(map);
          map.getCanvas().style.cursor=`pointer`;
        });
        map.getCanvas().addEventListener(`mouseleave`,clearHover);
        map.on(`movestart`,clearHover);
      } catch {
        failed=true;
        syncClients();
        status.textContent=`Map unavailable. Area totals and customer accounts are still available below.`;
      }
    }

    reset.onclick=()=>fit(visibleBounds());
    terrainButton.onclick=()=>{
      terrain=!terrain;
      map.setTerrain(terrain?{source:`elevation`,exaggeration:1.35}:null);
      terrainButton.textContent=terrain?`3D terrain`:`2D view`;
      terrainButton.setAttribute(`aria-pressed`,String(terrain));
      map.easeTo({pitch:terrain?36:0,bearing:0,duration:reduceMotion?0:450});
    };

    const observer = new IntersectionObserver(entries=>{
      if (!entries.some(entry=>entry.isIntersecting)) return;
      observer.disconnect();
      void load();
    },{rootMargin:`200px`});
    observer.observe(host);

    return {
      update(rows, selected, allowedAreas) {
        const selectedAreas=[...selected].sort();
        const areaTotals=new Map(), grouped=new Map();
        for (const row of rows) {
          areaTotals.set(row.area,(areaTotals.get(row.area)||0)+row.value);
          const key=JSON.stringify([row.customer,row.area]);
          const client=grouped.get(key)||{customer:row.customer,name:row.customerName,area:row.area,net:0};
          client.net+=row.value;
          grouped.set(key,client);
        }
        clients=[...grouped.values()].sort((a,b)=>b.net-a.net);
        const clear=element(`option`,`All matching areas`);
        clear.value=``;
        areaPicker.replaceChildren(clear,...allowedAreas.map(area=>{
          const option=element(`option`,area);
          option.value=area;
          return option;
        }));
        if (selectedAreas.length>1) {
          const multiple=element(`option`,`${selectedAreas.length} selected areas`);
          multiple.value=`__multiple__`;
          multiple.disabled=true;
          areaPicker.append(multiple);
        }
        areaPicker.value=selectedAreas.length>1?`__multiple__`:selectedAreas[0]||``;
        areaPicker.onchange=()=>selectArea(areaPicker.value);
        const areaList=host.querySelector(`.jmap-area-list`);
        const ordered=[...areaTotals].filter(([area])=>normalize(area)!==chainArea).sort((a,b)=>b[1]-a[1]);
        areaList.replaceChildren(...ordered.map(([area,net])=>{
          const button=action(null,()=>selectArea(area),`jmap-row`);
          button.append(element(`bdi`,area),element(`strong`,fmt.format(net)));
          return button;
        }));
        if (!ordered.length) areaList.append(element(`p`,`No areas match the current filters.`));
        syncClients();
      }
    };
  }

  return {create};
})();
