"""Apply supplied typography without changing native UI layout or asset data."""
import re

def font_faces(bundle):
    rules=[]
    for font in bundle['fonts']:
        weight=' '.join(str(w) for w in font['weightRange']) if font['weightRange'] else str(font['weight'])
        rules.append("@font-face{font-family:'"+font['family']+"';src:url('.."+font['data']['url']+"') format('truetype');font-weight:"+weight+";font-style:"+font['style']+";font-display:swap}")
    return '\n'.join(rules+[':root{font-synthesis:none}'])+'\n'

def typography_css(css):
    css=re.sub(r'--sans:\s*[^;]+;', "--sans: 'Banga', sans-serif;", css)
    css=css.replace("'Trebuchet MS',Arial,sans-serif", "'Banga',sans-serif")
    css=css.replace('system-ui,-apple-system,"Segoe UI",sans-serif', "'Banga',sans-serif")
    css=css.replace("'Trebuchet MS',sans-serif", "'Banga',sans-serif")
    css=css.replace('Georgia', "'Ga Maamli'")
    return css

def typography_markup(markup):
    markup=re.sub(r'(<style[^>]*>)(.*?)(</style>)',lambda m:m[1]+typography_css(m[2])+m[3],markup,flags=re.S)
    link='<link rel="stylesheet" href="../content/fonts.css">'
    if link not in markup:markup=markup.replace('</head>',link+'</head>')
    return markup
