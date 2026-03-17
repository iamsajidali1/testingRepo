import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { GeoAddressModel } from '../../models/address.model';
import { environment } from '../../../../../environments/environment';
import { BingmapService } from '../../services/bingmap.service';

declare const Microsoft: any;

@Component({
  selector: 'app-bingmap',
  templateUrl: './bingmap.component.html',
  styleUrls: ['./bingmap.component.scss']
})
export class BingmapComponent implements OnChanges {
  @ViewChild('myMap') mapViewChild: ElementRef | undefined;
  @Input() geoAddress: GeoAddressModel | undefined;
  @Input() pushPins: GeoAddressModel[] | undefined;
  mapType: string = 'road';
  navigationBarMode: string = 'compact';

  isMapReady: boolean = false;

  constructor(private bingMapService: BingmapService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes) {
      // If the Map is Already Loaded then just Reinitialize it
      if (this.isMapReady) return this.initMap();
      // Otherwise Load the map and Reinitialize it
      this.bingMapService.load().then(() => {
        this.isMapReady = true;
        this.initMap();
      });
    }
  }

  initMap() {
    const map = this.getMap();
    if (this.geoAddress) this.setMapView(map, this.geoAddress);
    else if (this.pushPins) this.setMapViewForPushpins(map, this.pushPins);
  }

  getMap() {
    return new Microsoft.Maps.Map(this.mapViewChild?.nativeElement, {
      credentials: environment.BING_API_KEY,
      navigationBarMode:
        Microsoft.Maps.NavigationBarMode[this.navigationBarMode],
      supportedMapTypes: [
        Microsoft.Maps.MapTypeId.road,
        Microsoft.Maps.MapTypeId.aerial,
        Microsoft.Maps.MapTypeId.grayscale
      ]
    });
  }

  setMapView(myMap: any, data: GeoAddressModel) {
    if (!data) return;
    myMap.setView({
      mapTypeId: Microsoft.Maps.MapTypeId[this.mapType],
      center: new Microsoft.Maps.Location(data.latitude, data.longitude)
    });
    const center = myMap.getCenter();
    const pushpin = new Microsoft.Maps.Pushpin(center);
    const infobox = new Microsoft.Maps.Infobox(center, {
      title: data.title,
      description: data.address,
      visible: false
    });
    infobox.setMap(myMap);

    Microsoft.Maps.Events.addHandler(pushpin, 'click', function () {
      infobox.setOptions({ visible: true });
    });

    myMap.entities.push(pushpin);
    pushpin.setOptions({ enableHoverStyle: true, enableClickedStyle: true });
  }

  setMapViewForPushpins(myMap: any, pushpins: GeoAddressModel[]) {
    if (!(pushpins && pushpins.length)) return;
    // Set up the Map Options
    const options: any = {};
    const pinsOnMap = pushpins.map(
      (pushpin) =>
        new Microsoft.Maps.Pushpin(
          {
            latitude: pushpin.latitude,
            longitude: pushpin.longitude
          },
          {
            enableClickedStyle: true,
            enableHoverStyle: true,
            color: '#673ab7'
          }
        )
    );
    // Infobox and it's click handler
    pushpins.forEach((pushpin, index) => {
      const infobox = new Microsoft.Maps.Infobox(
        pinsOnMap[index].getLocation(),
        {
          title: pushpin.title,
          description: pushpin.address,
          visible: false
        }
      );
      infobox.setMap(myMap);
      Microsoft.Maps.Events.addHandler(
        pinsOnMap[index],
        'click',
        function (args: any) {
          infobox.setOptions({
            location: args.target.getLocation(),
            title: pushpin.title,
            description: pushpin.address,
            visible: true
          });
        }
      );
    });

    myMap.entities.push(pinsOnMap);
    if (pushpins.length > 1) {
      // If there are more pushpins, get the bound for best viewport
      options.bounds = Microsoft.Maps.LocationRect.fromLocations(
        pushpins.map((pin) => ({
          latitude: pin.latitude,
          longitude: pin.longitude
        }))
      );
    } else {
      // There is only one pushpin, so center the map viewport concentrating there
      const [onlyPushpin] = pushpins;
      options.center = new Microsoft.Maps.Location(
        onlyPushpin.latitude,
        onlyPushpin.longitude
      );
    }
    options.mapTypeId = Microsoft.Maps.MapTypeId[this.mapType];
    myMap.setView(options);
  }
}
