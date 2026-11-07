"""Validated source-provenance responses and safe illustrative plot data.

Structured model output is *not* trusted as evidence by itself. A textbook badge
requires at least one ebook file present in the actual file-search response.
"""
import json
import math

from source_map import SOURCE_MAP, source_details

CATEGORIES = {'book', 'mixed', 'related_outside', 'out_of_scope'}
PLOT_TYPES = {'normal', 't', 'chi_square', 'f', 'line', 'scatter', 'bar'}

PLOT_SCHEMA = {
    'type': ['object', 'null'],
    'properties': {
        'type': {'type': 'string', 'enum': sorted(PLOT_TYPES)},
        'title': {'type': 'string'},
        'x_label': {'type': 'string'},
        'y_label': {'type': 'string'},
        'mean': {'type': ['number', 'null']},
        'sd': {'type': ['number', 'null']},
        'df': {'type': ['number', 'null']},
        'df2': {'type': ['number', 'null']},
        'series': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'points': {
                        'type': 'array',
                        'items': {'type': 'array', 'items': {'type': 'number'}},
                    },
                },
                'required': ['name', 'points'],
                'additionalProperties': False,
            },
        },
        'note': {'type': 'string'},
    },
    'required': ['type', 'title', 'x_label', 'y_label', 'mean', 'sd', 'df', 'df2', 'series', 'note'],
    'additionalProperties': False,
}

ANSWER_FORMAT = {
    'type': 'json_schema', 'name': 'sta258_provenance_reply', 'strict': True,
    'schema': {
        'type': 'object',
        'properties': {
            'category': {'type': 'string', 'enum': sorted(CATEGORIES)},
            'book_answer': {'type': 'string'},
            'related_answer': {'type': 'string'},
            'outside_answer': {'type': 'string'},
            'book_source_filenames': {'type': 'array', 'items': {'type': 'string'}},
            'plot': PLOT_SCHEMA,
        },
        'required': ['category', 'book_answer', 'related_answer', 'outside_answer',
                     'book_source_filenames', 'plot'],
        'additionalProperties': False,
    },
}


def _response_payload(response):
    try:
        return response.model_dump()
    except (AttributeError, TypeError):
        return {}


def verified_file_names(response):
    """Find actual files in model's search-result context or citation annotations."""
    found = set()
    for item in _response_payload(response).get('output', []) or []:
        if item.get('type') == 'file_search_call':
            for result in item.get('results', []) or []:
                filename = result.get('filename') or ''
                if isinstance(filename, str) and (filename in SOURCE_MAP or filename.startswith('dataset-')):
                    found.add(filename)
        if item.get('type') == 'message':
            for content in item.get('content', []) or []:
                for ann in content.get('annotations', []) or []:
                    filename = ann.get('filename') or ''
                    if ann.get('type') == 'file_citation' and isinstance(filename, str):
                        if filename in SOURCE_MAP or filename.startswith('dataset-'):
                            found.add(filename)
    return found


def _finite(value, default, low, high):
    if type(value) not in (float, int) or not math.isfinite(value):
        return default
    return max(low, min(high, float(value)))


def normalize_plot(plot):
    """Generate deterministic, trustworthy densities; validate model-provided sample data.

    Never run model-provided Python/R/JavaScript code.
    """
    if not isinstance(plot, dict) or plot.get('type') not in PLOT_TYPES:
        return None
    kind = plot['type']
    title = str(plot.get('title') or 'Illustrative graph')[:130]
    x_label = str(plot.get('x_label') or 'x')[:60]
    y_label = str(plot.get('y_label') or 'Value')[:60]
    note = str(plot.get('note') or 'Illustrative, AI-generated graph; not from the ebook.')[:250]
    series = []
    if kind in {'normal', 't', 'chi_square', 'f'}:
        mu = _finite(plot.get('mean'), 0.0, -100000, 100000)
        sd = _finite(plot.get('sd'), 1.0, .00001, 100000)
        df = _finite(plot.get('df'), 5.0, 1.0, 500)
        df2 = _finite(plot.get('df2'), 12.0, 1.0, 500)
        if kind == 'normal':
            xs = [mu - 4 * sd + 8 * sd * i / 120 for i in range(121)]
            pts = [(x, math.exp(-.5 * ((x-mu)/sd)**2)/(sd*math.sqrt(2*math.pi))) for x in xs]
            label = f'Normal(μ={mu:g}, σ={sd:g})'
        elif kind == 't':
            xs = [-5 + 10 * i / 120 for i in range(121)]
            const = math.exp(math.lgamma((df+1)/2)-math.lgamma(df/2)) / math.sqrt(df*math.pi)
            pts = [(x, const*(1+x*x/df)**(-(df+1)/2)) for x in xs]
            label = f't(df={df:g})'
        elif kind == 'chi_square':
            top = df + 5 * math.sqrt(2 * df)
            xs = [max(.001, top*i/120) for i in range(121)]
            c = -(df/2)*math.log(2) - math.lgamma(df/2)
            pts = [(x, math.exp(c+(df/2-1)*math.log(x)-x/2)) for x in xs]
            label = f'χ²(df={df:g})'
        else:
            xs = [max(.001, .01 + 6.99*i/120) for i in range(121)]
            a, b = df/2, df2/2
            logc = a*math.log(df/df2) + math.lgamma(a+b)-math.lgamma(a)-math.lgamma(b)
            pts = [(x, math.exp(logc+(a-1)*math.log(x)-(a+b)*math.log1p(df*x/df2))) for x in xs]
            label = f'F({df:g}, {df2:g})'
        # The PDF for small df can be unbounded at 0; cap its visual spike.
        maximum = sorted(y for _, y in pts)[int(len(pts)*.96)]
        series = [{'name': label, 'points': [[round(x,6), round(min(y, maximum*2),9)] for x,y in pts]}]
        y_label = 'Probability density'
    else:
        for raw in (plot.get('series') or [])[:3]:
            if not isinstance(raw, dict):
                continue
            points = []
            for pt in (raw.get('points') or [])[:160]:
                if not isinstance(pt, (list,tuple)) or len(pt) != 2:
                    continue
                x,y = pt
                if type(x) in (float,int) and type(y) in (float,int) and math.isfinite(x) and math.isfinite(y):
                    if abs(x) < 1e9 and abs(y) < 1e9:
                        points.append([float(x),float(y)])
            if points:
                series.append({'name': str(raw.get('name') or 'Illustrative data')[:60], 'points': points})
    if not series:
        return None
    return {'type': kind, 'title': title, 'x_label': x_label, 'y_label': y_label,
            'series': series, 'note': note}


def parse_answer(response):
    """Interpret one structured API response and keep provenance conservative."""
    raw = getattr(response, 'output_text', '') or ''
    try:
        obj = json.loads(raw)
    except (TypeError, ValueError):
        # Never show an unverified answer with a green textbook badge.
        return {'category': 'related_outside', 'book_answer': '',
                'related_answer': raw or 'I was unable to prepare a response.',
                'outside_answer': '', 'sources': [], 'plot': None}
    if not isinstance(obj, dict):
        obj = {}
    book = str(obj.get('book_answer') or '').strip()
    related = str(obj.get('related_answer') or '').strip()
    outside = str(obj.get('outside_answer') or '').strip()
    requested = [s for s in (obj.get('book_source_filenames') or [])
                 if isinstance(s, str)]
    verified = verified_file_names(response)
    names = list(dict.fromkeys(s for s in requested if s in verified))[:6]
    sources = [source_details(s) for s in names] if book else []
    if book and not sources:
        # The book claim cannot be independently attributed to a retrieved file.
        # Keep the content usable, but make the uncertain provenance explicit.
        related = ('**Unable to verify a supporting ebook citation for the following:**\n\n'
                   + book + ('\n\n' + related if related else ''))
        book = ''
    plot = normalize_plot(obj.get('plot'))
    if plot:
        # Generated plots are *always* non-book additions, including after a
        # book-based explanation. The frontend visibly labels them orange.
        if outside and not (book or related):
            plot = None
        elif not related:
            related = 'The following is a newly generated illustration, not a figure from the ebook.'
    if book and related:
        category = 'mixed'
    elif book:
        category = 'book'
    elif related:
        category = 'related_outside'
    else:
        category = 'out_of_scope'
        if not outside:
            outside = 'This question is outside the subject area of the STA258 ebook.'
    if category != 'out_of_scope':
        outside = ''
    return {'category': category, 'book_answer': book, 'related_answer': related,
            'outside_answer': outside, 'sources': sources, 'plot': plot}
