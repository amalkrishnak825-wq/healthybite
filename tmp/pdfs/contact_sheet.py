from PIL import Image, ImageDraw
from pathlib import Path
files=sorted(Path('tmp/pdfs').glob('page-*.png'))
tiles=[]
for f in files:
    im=Image.open(f).convert('RGB')
    im.thumbnail((320,450))
    tile=Image.new('RGB',(340,480),'#dce6dc')
    tile.paste(im,((340-im.width)//2,10))
    ImageDraw.Draw(tile).text((12,460),f.stem,fill='#123d2e')
    tiles.append(tile)
out=Image.new('RGB',(340*4,480*((len(tiles)+3)//4)),'white')
for i,tile in enumerate(tiles):
    out.paste(tile,((i%4)*340,(i//4)*480))
out.save('tmp/pdfs/contact.png')
print('rendered',len(files),'pages')
