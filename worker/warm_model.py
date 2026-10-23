"""Download the pinned model and check real multilingual inference within limits."""
import os
for name in ('OMP_NUM_THREADS','OPENBLAS_NUM_THREADS','MKL_NUM_THREADS'):
    os.environ[name]='1'
os.environ['TOKENIZERS_PARALLELISM']='false'
os.environ['HF_HUB_DISABLE_XET']='1'
import torch
from sentence_transformers import SentenceTransformer
from core import MODEL, REVISION, embed_claim
torch.set_num_threads(1)
model=SentenceTransformer(MODEL,revision=REVISION,device='cpu',trust_remote_code=False)
vector=embed_claim(model,{'title':'Pretendim për shqyrtim','description':'Një shembull për testimin e analizës shumëgjuhëshe.'})
assert vector is not None and len(vector)==384
long_vector=embed_claim(model,{'title':'Shembull i gjatë për testim','description':'Pretendim i përsëritur për shqyrtim. '*200})
assert long_vector is not None and len(long_vector)==384
print('Pinned multilingual model ready; 384-dimensional inference passed')
