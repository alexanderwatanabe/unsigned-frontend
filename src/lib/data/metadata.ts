export const unsigMetadata = `
721 : {
  "0e14267a8020229adc0184dd25fa3174c3f7d6caadcb4425c70e7c04": {
    "unsig00000": {
      "files": [
        {
          "code": {
            "file": "unsig.py",
            "mediatype": "text/python",
            "src": [
              "import numpy as np",
              "from PIL import Image",
              "",
              "",
              "#pixel dimension",
              "dim = 4096",
              "",
              "#replace the content inside {} with your unsig's properties",
              "unsig = {'index': 0,",
              "         'num_props': 0,",
              "         'properties': {",
              "             'multipliers'   : [],",
              "             'colors'        : [],",
              "             'distributions' : [],",
              "             'rotations'     : []}}",
              "",
              "def norm(x , mean , std):",
              "    p = (np.pi*std) * np.exp(-0.5*((x-mean)/std)**2)",
              "    return p",
              "",
              "def scale_make2d(s):",
              "    scaled = np.interp(s, (s.min(), s.max()), (0, u_range))",
              "    two_d = np.tile(scaled, (dim, 1))",
              "    return two_d",
              "",
              "def gen_nft(nft):",
              "    idx = unsig['index']",
              "    props = unsig['properties']",
              "    props['multipliers']=list(map(float, props['multipliers']))",
              "    props['rotations']=list(map(int, props['rotations']))",
              "",
              "    n = np.zeros((dim, dim, 3)).astype(np.uint32)",
              "",
              "    for i in range(unsig['num_props']):",
              "        mult = props['multipliers'][i]",
              "        col = props['colors'][i]",
              "        dist = props['distributions'][i]",
              "        rot = props['rotations'][i]",
              "        c = channels[col]",
              "        buffer =  mult * np.rot90(dists[dist], k=(rot / 90))",
              "        n[ :, :, c ] = n[ :, :, c ] + buffer",
              "",
              "    n = np.interp(n, (0, u_range), (0, 255)).astype(np.uint8)",
              "",
              "    return (idx, n)",
              "",
              "if __name__ == '__main__':",
              "    #setup",
              "    x = list(range(dim))",
              "    u_range = 4294967293",
              "    mean = np.mean(x)",
              "    std = dim/6",
              "",
              "    #probability and cumulative distribution",
              "    p_1d = np.array(norm(x, mean, std)).astype(np.uint32)",
              "    c_1d = np.cumsum(p_1d)",
              "",
              "    #2d arrays",
              "    p_2d = scale_make2d(p_1d)",
              "    c_2d = scale_make2d(c_1d)",
              "",
              "    #dicts for retrieving values",
              "    dists = {'Normal': p_2d, 'CDF': c_2d}",
              "    channels = {'Red': 0, 'Green': 1, 'Blue': 2}",
              "",
              "    #make your nft",
              "    i, nft = gen_nft(unsig)",
              "",
              "    img = Image.fromarray(nft)",
              "    img.save(f'unsig_{i:05d}.png')"
            ]
          },
          "env": {
            "file": "unsig.yml",
            "mediatype": "text/conda",
            "src": [
              "name: unsig",
              "channels:",
              "  - defaults",
              "dependencies:",
              "  - python=3.8.10=hdb3f193_7",
              "  - numpy=1.20.2=py38h2d18471_0",
              "  - pillow=8.2.0=py38he98fc37_0"
            ]
          }
        }
      ],
      "image": "ipfs://QmTBKj1y1CXNaZzBWHtSiAWbuUTHUgT1h7NEUDSmaCxBdJ",
      "series": "unsigned_algorithms",
      "title": "unsig_00000"
    }
  }
}`;