
ALTER TABLE presentation_slides DROP CONSTRAINT IF EXISTS presentation_slides_layout_check;
ALTER TABLE presentation_slides ADD CONSTRAINT presentation_slides_layout_check
  CHECK (layout IN ('cover','content','image','split','quote','closing','cards','fullbleed'));

DELETE FROM presentation_slides WHERE presentation_id = 'c68630fd-43de-4d18-a407-d0e44c939e91';

INSERT INTO presentation_slides (presentation_id, layout, image_url, order_index, title) VALUES
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/13137c20-a7e4-4c34-a9c4-b41b1efd50ab/inst-page-01.jpg',1,'Capa'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/b78641d4-c02a-4d34-a546-f8e8469d8bf9/inst-page-02.jpg',2,'Página 2'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/ed580280-e9ff-4e0a-ab26-a4c548693099/inst-page-03.jpg',3,'Página 3'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/63917f90-e538-4f6d-bb5b-d253c4a607f5/inst-page-04.jpg',4,'Página 4'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/949135d2-a2a1-4960-8900-cfd252bab5bb/inst-page-05.jpg',5,'Página 5'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/78d0b0ad-ccb3-4f93-8102-554b564bc96b/inst-page-06.jpg',6,'Página 6'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/e3d64ed1-1743-4ef1-ad89-f02509f8c726/inst-page-07.jpg',7,'Página 7'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/07cb76eb-6d2a-430f-bfb4-8931864f9c51/inst-page-08.jpg',8,'Página 8'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/f087468e-d8c6-4c64-a0ca-4aa634c43d8e/inst-page-09.jpg',9,'Página 9'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/55b2ba47-6b56-4e6d-a82d-9ba13ed30a2b/inst-page-10.jpg',10,'Página 10'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/d83abb54-5608-4a5d-9055-fe6c9eb02b8f/inst-page-11.jpg',11,'Página 11'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/53c095e8-b46f-4a59-8386-746179c66b72/inst-page-12.jpg',12,'Página 12'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/416aec85-8301-487a-ac60-47f908c4b70d/inst-page-13.jpg',13,'Página 13'),
('c68630fd-43de-4d18-a407-d0e44c939e91','fullbleed','/__l5e/assets-v1/daefa727-5619-4c01-ba2f-88b1a4c5ae91/inst-page-14.jpg',14,'Página 14');
