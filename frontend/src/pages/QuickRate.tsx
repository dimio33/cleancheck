import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function QuickRate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    // Fetch restaurant and redirect to rating flow
    api.get(`/restaurants/${id}`)
      .then(({ data }) => {
        if (data.restaurant) {
          navigate('/rate', {
            state: { restaurantId: id },
            replace: true,
          });
        } else {
          navigate('/');
        }
      })
      .catch(() => {
        // Restaurant might not exist in DB yet, redirect to home
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return null;
}
