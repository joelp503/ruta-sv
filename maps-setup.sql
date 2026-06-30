-- Ruta SV v4 Maps Setup
-- Run this in Supabase SQL Editor before using the v4 admin form.

alter table places
add column if not exists google_maps_url text;

update places set google_maps_url = case slug
  when 'el-tunco' then 'https://www.google.com/maps/search/?api=1&query=Playa%20El%20Tunco%2C%20Tamanique%2C%20La%20Libertad%2C%20El%20Salvador'
  when 'santa-ana-volcano' then 'https://www.google.com/maps/search/?api=1&query=Santa%20Ana%20Volcano%20Ilamatepec%2C%20El%20Salvador'
  when 'suchitoto' then 'https://www.google.com/maps/search/?api=1&query=Suchitoto%2C%20Cuscatlan%2C%20El%20Salvador'
  when 'lake-coatepeque' then 'https://www.google.com/maps/search/?api=1&query=Lago%20de%20Coatepeque%2C%20Santa%20Ana%2C%20El%20Salvador'
  when 'ruta-de-las-flores' then 'https://www.google.com/maps/search/?api=1&query=Ruta%20de%20las%20Flores%2C%20El%20Salvador'
  when 'el-zonte' then 'https://www.google.com/maps/search/?api=1&query=Playa%20El%20Zonte%2C%20La%20Libertad%2C%20El%20Salvador'
  when 'la-libertad-pier' then 'https://www.google.com/maps/search/?api=1&query=Muelle%20Puerto%20de%20La%20Libertad%2C%20El%20Salvador'
  when 'cerro-verde-national-park' then 'https://www.google.com/maps/search/?api=1&query=Parque%20Nacional%20Cerro%20Verde%2C%20Santa%20Ana%2C%20El%20Salvador'
  when 'el-boqueron' then 'https://www.google.com/maps/search/?api=1&query=Parque%20Nacional%20El%20Boqueron%2C%20San%20Salvador%2C%20El%20Salvador'
  when 'ataco' then 'https://www.google.com/maps/search/?api=1&query=Concepcion%20de%20Ataco%2C%20Ahuachapan%2C%20El%20Salvador'
  when 'juayua' then 'https://www.google.com/maps/search/?api=1&query=Juayua%2C%20Sonsonate%2C%20El%20Salvador'
  when 'apaneca' then 'https://www.google.com/maps/search/?api=1&query=Apaneca%2C%20Ahuachapan%2C%20El%20Salvador'
  when 'joya-de-ceren' then 'https://www.google.com/maps/search/?api=1&query=Joya%20de%20Ceren%2C%20La%20Libertad%2C%20El%20Salvador'
  when 'tazumal' then 'https://www.google.com/maps/search/?api=1&query=Tazumal%2C%20Chalchuapa%2C%20Santa%20Ana%2C%20El%20Salvador'
  when 'san-salvador-historic-center' then 'https://www.google.com/maps/search/?api=1&query=Centro%20Historico%20de%20San%20Salvador%2C%20El%20Salvador'
  when 'national-library-of-el-salvador' then 'https://www.google.com/maps/search/?api=1&query=Biblioteca%20Nacional%20de%20El%20Salvador%2C%20San%20Salvador'
  when 'playa-el-cuco' then 'https://www.google.com/maps/search/?api=1&query=Playa%20El%20Cuco%2C%20Chirilagua%2C%20San%20Miguel%2C%20El%20Salvador'
  when 'alegria-lagoon' then 'https://www.google.com/maps/search/?api=1&query=Laguna%20de%20Alegria%2C%20Usulutan%2C%20El%20Salvador'
  when 'conchagua-volcano' then 'https://www.google.com/maps/search/?api=1&query=Volcan%20de%20Conchagua%2C%20La%20Union%2C%20El%20Salvador'
  when 'los-chorros' then 'https://www.google.com/maps/search/?api=1&query=Parque%20Recreativo%20Los%20Chorros%2C%20Colon%2C%20La%20Libertad%2C%20El%20Salvador'
  else google_maps_url
end
where google_maps_url is null or google_maps_url = '';
