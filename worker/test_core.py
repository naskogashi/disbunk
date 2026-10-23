import unittest
import numpy as np
from core import fingerprint, source_hash, group_vectors, embed_claim


class ClusteringTests(unittest.TestCase):
    def test_group_order_is_stable_but_content_and_scope_changes_invalidate(self):
        first = {'id':'1','title':'Same narrative','description':'Evidence','team_id':'a'}
        second = dict(first,id='2')
        self.assertEqual(fingerprint([first,second]),fingerprint([second,first]))
        self.assertNotEqual(source_hash(first),source_hash(dict(first,team_id='b')))
        self.assertNotEqual(source_hash(first),source_hash(dict(first,description='Changed')))

    def test_small_batches_are_not_forced_into_groups(self):
        labels, strengths = group_vectors(np.eye(4))
        self.assertTrue((labels==-1).all())
        self.assertTrue((strengths==0).all())

    def test_distinct_dense_groups_and_noise(self):
        rng = np.random.default_rng(42)
        a = rng.normal(0,0.005,(8,384)); a[:,0] += 1
        b = rng.normal(0,0.005,(8,384)); b[:,1] += 1
        labels,strengths = group_vectors(np.vstack([a,b]))
        self.assertEqual(len(set(labels)),2)
        self.assertEqual(len(set(labels[:8])),1)
        self.assertNotEqual(labels[0],labels[-1])
        self.assertTrue(((strengths>=0)&(strengths<=1)).all())

    def test_invalid_vectors_rejected(self):
        with self.assertRaises(ValueError):
            group_vectors(np.zeros((5,384)))

    def test_overlong_claim_is_explicitly_skipped(self):
        class Tokenizer:
            def encode(self,*args,**kwargs): return list(range(4001))
        class Model:
            tokenizer=Tokenizer()
        self.assertIsNone(embed_claim(Model(),{'title':'Long content'}))


if __name__=='__main__':
    unittest.main()
